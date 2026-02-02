import xml.etree.ElementTree as ET
from aade.types import AADEInvoice, InvoiceType

class InvoiceGenerator:
    """Generates XML compatible with AADE myDATA v1.0.7+"""
    
    NAMESPACES = {
        "": "http://www.aade.gr/myDATA/invoice/v1.0",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "icls": "https://www.aade.gr/myDATA/incomeClassificaton/v1.0",
        "ecls": "https://www.aade.gr/myDATA/expensesClassificaton/v1.0"
    }
    
    @staticmethod
    def generate_xml(invoice: AADEInvoice) -> str:
        # Root element
        root = ET.Element("InvoicesDoc", {
            "xmlns": "http://www.aade.gr/myDATA/invoice/v1.0",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "xsi:schemaLocation": "http://www.aade.gr/myDATA/invoice/v1.0/InvoicesDoc-v0.6.xsd"
        })
        
        invoice_elem = ET.SubElement(root, "invoice")
        
        # Issuer
        issuer = ET.SubElement(invoice_elem, "issuer")
        ET.SubElement(issuer, "vatNumber").text = invoice.issuer.vat_number
        ET.SubElement(issuer, "country").text = invoice.issuer.country
        ET.SubElement(issuer, "branch").text = str(invoice.issuer.branch)
        
        # Counterpart (omitted for Retail usually, but good to have logic)
        if invoice.counterpart:
            counterpart = ET.SubElement(invoice_elem, "counterpart")
            ET.SubElement(counterpart, "vatNumber").text = invoice.counterpart.vat_number
            ET.SubElement(counterpart, "country").text = invoice.counterpart.country
            ET.SubElement(counterpart, "branch").text = str(invoice.counterpart.branch)
            # Address info...
            
        # Header
        header = ET.SubElement(invoice_elem, "invoiceHeader")
        ET.SubElement(header, "series").text = invoice.series
        ET.SubElement(header, "aa").text = invoice.aa
        ET.SubElement(header, "issueDate").text = invoice.issue_date.strftime("%Y-%m-%d")
        ET.SubElement(header, "invoiceType").text = invoice.invoice_type.value
        ET.SubElement(header, "currency").text = invoice.currency
        
        # Payment details
        payment = ET.SubElement(invoice_elem, "paymentMethods")
        details = ET.SubElement(payment, "paymentMethodDetails")
        ET.SubElement(details, "type").text = str(invoice.payment_method)
        ET.SubElement(details, "amount").text = "{:.2f}".format(invoice.summary.total_gross_value)
        
        # Rows
        for row in invoice.rows:
            row_elem = ET.SubElement(invoice_elem, "invoiceDetails")
            ET.SubElement(row_elem, "lineNumber").text = str(row.line_number)
            ET.SubElement(row_elem, "netValue").text = "{:.2f}".format(row.net_value)
            ET.SubElement(row_elem, "vatCategory").text = str(row.vat_category)
            ET.SubElement(row_elem, "vatAmount").text = "{:.2f}".format(row.vat_amount)
            
            # Simple income classification for E-shop retail (Sale of Goods)
            icls = ET.SubElement(row_elem, "incomeClassification")
            ET.SubElement(icls, "icls:classificationType").text = "E3_561_001" # Poliseis Agathon
            ET.SubElement(icls, "icls:classificationCategory").text = "category1_1" # Esoda apo Poliseis
            ET.SubElement(icls, "icls:amount").text = "{:.2f}".format(row.net_value)

        # Summary
        summary = ET.SubElement(invoice_elem, "invoiceSummary")
        ET.SubElement(summary, "totalNetValue").text = "{:.2f}".format(invoice.summary.total_net_value)
        ET.SubElement(summary, "totalVatAmount").text = "{:.2f}".format(invoice.summary.total_vat_amount)
        ET.SubElement(summary, "totalWithheldAmount").text = "{:.2f}".format(invoice.summary.total_withheld_amount)
        ET.SubElement(summary, "totalFeesAmount").text = "{:.2f}".format(invoice.summary.total_fees_amount)
        ET.SubElement(summary, "totalStampDutyAmount").text = "{:.2f}".format(invoice.summary.total_stamp_duty_amount)
        ET.SubElement(summary, "totalDeductionsAmount").text = "{:.2f}".format(invoice.summary.total_deductions_amount)
        ET.SubElement(summary, "totalGrossValue").text = "{:.2f}".format(invoice.summary.total_gross_value)
        
        # Income classification summary
        iclss = ET.SubElement(summary, "incomeClassification")
        ET.SubElement(iclss, "icls:classificationType").text = "E3_561_001"
        ET.SubElement(iclss, "icls:classificationCategory").text = "category1_1"
        ET.SubElement(iclss, "icls:amount").text = "{:.2f}".format(invoice.summary.total_net_value)

        # Generate string
        xml_str = ET.tostring(root, encoding="utf-8", method="xml")
        return xml_str.decode("utf-8")
