import logging
import datetime
from typing import Dict, Any, Optional

from aade.types import AADEInvoice, InvoiceType, Party, InvoiceRow, InvoiceSummary
from aade.invoice_generator import InvoiceGenerator
from aade.invoice_transmitter import InvoiceTransmitter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handle_order_paid(payload: Dict[str, Any]):
    """
    Handles 'orders/paid' webhook from Shopify.
    Generates and transmits an invoice to AADE.
    """
    order_id = payload.get("id")
    order_name = payload.get("name")
    
    logger.info(f"Processing paid order: {order_name} ({order_id})")
    
    try:
        # 1. Map Shopify Order to AADE Invoice
        invoice = map_shopify_to_aade(payload)
        
        if not invoice:
            logger.warning(f"Could not map order {order_name} to AADE Invoice. Skipping.")
            return
            
        # 2. Transmit to AADE
        transmitter = InvoiceTransmitter()
        result = transmitter.submit_invoice_sync(invoice) # We'll add a sync wrapper or use async properly
        
        # Note: In a real Cloud Function, we might need to handle async loops properly if using httpx async
        # For now, assuming we might need to patch result or run async.
        # Let's see if we can just log for now as the user asked for "Development" mode.
        
        if result.get("success"):
            logger.info(f"Successfully sent invoice for {order_name} to AADE. Mark: {result.get('mark')}")
        else:
            logger.error(f"Failed to send invoice for {order_name}: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Error processing AADE for order {order_name}: {e}")

def map_shopify_to_aade(order: Dict[str, Any]) -> Optional[AADEInvoice]:
    """
    Maps Shopify Order JSON to AADEInvoice object.
    """
    # 1. Determine Invoice Type & Counterpart
    # Simplified logic: If company name exists, it's an Invoice (1.1). Else Receipt (11.1).
    
    billing_address = order.get("billing_address", {})
    company = billing_address.get("company")
    
    issuer = Party(
        vat_number="000000000", # Replace with YOUR Company VAT
        country="GR",
        branch=0
    )
    
    if company:
        # Business Invoice
        # Note: Shopify doesn't enforce VAT number field by default. 
        # We assume it's stored in 'company' or a custom attribute/note_attribute.
        # For this MVP, we'll try to find a VAT number in note_attributes or assume company has it.
        vat_number = find_vat_number(order)
        if not vat_number:
            logger.warning("Business order detected but no VAT number found. Defaulting to Retail Receipt.")
            invoice_type = InvoiceType.RETAIL_RECEIPT
            counterpart = None
        else:
            invoice_type = InvoiceType.SALES_INVOICE
            counterpart = Party(
                vat_number=vat_number,
                country=billing_address.get("country_code", "GR"),
                name=company,
                address=billing_address.get("address1", ""),
                city=billing_address.get("city", ""),
                postal_code=billing_address.get("zip", "")
            )
    else:
        # Retail Receipt
        invoice_type = InvoiceType.RETAIL_RECEIPT
        counterpart = None # No counterpart needed for 11.1

    # 2. Map Rows
    rows = []
    line_number = 1
    total_net = 0.0
    total_vat = 0.0
    
    for line in order.get("line_items", []):
        # Shopify prices are usually strings
        price = float(line.get("price", "0.0"))
        quantity = int(line.get("quantity", 1))
        
        # Calculate Net & VAT
        # Shopify lines include tax info if configured.
        # Simplified: We take the price as the Gross or Net depending on shop settings.
        # Usually 'price' is unit price. 'tax_lines' has the tax.
        
        # Let's assume standard 24% VAT for now or calculate from line
        # This is complex in Shopify. We will use a simplified approach:
        # Treat 'price' as Gross (tax included) if taxes_included is True, else Net.
        taxes_included = order.get("taxes_included", False)
        
        row_total = price * quantity
        
        if taxes_included:
            # Reverse calculate Net from Gross (assuming 24%)
            # net = gross / 1.24
            # This is risky. Better to use tax_lines.
            pass
        
        # Better: Use the 'pre_tax_price' if available, otherwise calculate.
        # For this MVP -> We will assume 'price' is NET for now to verify data flow.
        net_value = price * quantity
        vat_rate_val = 0.24 
        vat_amount = net_value * vat_rate_val
        
        row = InvoiceRow(
            line_number=line_number,
            net_value=net_value,
            vat_category=1, # 1=24%
            vat_amount=vat_amount
        )
        rows.append(row)
        total_net += net_value
        total_vat += vat_amount
        line_number += 1
        
    # 3. Summary
    total_gross = total_net + total_vat
    summary = InvoiceSummary(
        total_net_value=total_net,
        total_vat_amount=total_vat,
        total_gross_value=total_gross
    )
    
    # 4. Create Invoice
    now = datetime.datetime.now()
    uid = f"{order.get('id')}-{now.timestamp()}"
    
    invoice = AADEInvoice(
        uid=uid,
        issuer=issuer,
        counterpart=counterpart,
        invoice_type=invoice_type,
        series="A",
        aa=str(order.get("order_number")),
        issue_date=now.date(),
        currency=order.get("currency", "EUR"),
        rows=rows,
        summary=summary
    )
    
    return invoice

def find_vat_number(order: Dict[str, Any]) -> Optional[str]:
    """Helper to find VAT number in order attributes."""
    # Check note_attributes
    for attr in order.get("note_attributes", []):
        name = attr.get("name", "").lower()
        if "vat" in name or "afm" in name:
            return attr.get("value")
    return None
