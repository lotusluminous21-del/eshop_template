import os
import httpx
from aade.types import AADEInvoice
from aade.invoice_generator import InvoiceGenerator

class InvoiceTransmitter:
    """Transmits invoices to AADE myDATA."""
    
    PROD_URL = "https://mydatapi.aade.gr/myDATA/SendInvoices"
    DEV_URL = "https://mydata-dev.azure-api.net/SendInvoices"
    
    def __init__(self):
        self.user_id = os.environ.get("AADE_USER_ID")
        self.subscription_key = os.environ.get("AADE_SUBSCRIPTION_KEY")
        self.env = os.environ.get("AADE_ENVIRONMENT", "development")
        self.url = self.PROD_URL if self.env == "production" else self.DEV_URL
        
        if not self.user_id or not self.subscription_key:
            print("Notice: AADE credentials missing. Running in MOCK/DEV mode (Logging only).")
            self.mock_mode = True
        else:
            self.mock_mode = False
    
    async def transmit_invoice(self, invoice: AADEInvoice) -> dict:
        """Generates XML and sends to AADE."""
        
        # 1. Generate XML
        xml_content = InvoiceGenerator.generate_xml(invoice)
        
        # 2a. Check Mock Mode
        if self.mock_mode:
            print(f"--- [AADE MOCK MODE] WOULD SEND XML ---")
            print(xml_content)
            print(f"---------------------------------------")
            return {
                "success": True,
                "mark": "MOCK-MARK-12345",
                "uid": invoice.uid,
                "xml_sent": xml_content
            }

        # 2. Prepare headers
        headers = {
            "aade-user-id": self.user_id,
            "Ocp-Apim-Subscription-Key": self.subscription_key,
            "Content-Type": "application/xml"
        }
        
        # 3. Send
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.url,
                content=xml_content,
                headers=headers
            )
            
            # 4. Parse response (Simplified)
            if response.status_code == 200:
                # Need to parse XML response to get UID/MARK
                # For now returning raw text
                return {
                    "success": True,
                    "response": response.text,
                    "xml_sent": xml_content
                }
            else:
                return {
                    "success": False,
                    "error": response.text,
                    "status": response.status_code
                }

    def submit_invoice_sync(self, invoice: AADEInvoice) -> dict:
        """Synchronous wrapper for Cloud Functions."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.transmit_invoice(invoice))
