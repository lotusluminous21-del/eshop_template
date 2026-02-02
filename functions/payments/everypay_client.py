import os
import httpx
import base64
from typing import Optional

class EverypayClient:
    """Everypay payment client for Greek market."""
    
    SANDBOX_URL = "https://sandbox-api.everypay.gr"
    PROD_URL = "https://api.everypay.gr"
    
    def __init__(self):
        self.secret_key = os.environ.get("EVERYPAY_SECRET_KEY")
        self.public_key = os.environ.get("EVERYPAY_PUBLIC_KEY")
        self.is_production = os.environ.get("EVERYPAY_ENVIRONMENT") == "production"
        self.base_url = self.PROD_URL if self.is_production else self.SANDBOX_URL
    
    def _get_auth_header(self) -> dict:
        """Generate Basic Auth header."""
        if not self.secret_key:
            raise ValueError("EVERYPAY_SECRET_KEY is not set")
        credentials = base64.b64encode(f"{self.secret_key}:".encode()).decode()
        return {"Authorization": f"Basic {credentials}"}
    
    async def create_payment(
        self,
        token: str,  # Card token from frontend
        amount_cents: int,
        order_id: str,
        description: str,
        customer_email: str = None
    ) -> dict:
        """Create a payment using a card token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments",
                data={
                    "token": token,
                    "amount": amount_cents,
                    "description": description,
                    "merchant_ref": order_id,
                    "customer_email": customer_email
                },
                headers=self._get_auth_header()
            )
            response.raise_for_status()
            return response.json()
    
    async def create_payment_link(
        self,
        amount_cents: int,
        order_id: str,
        description: str,
        success_url: str,
        failure_url: str,
        customer_email: str = None
    ) -> dict:
        """Create a hosted payment page link."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/payments/create-link",
                data={
                    "amount": amount_cents,
                    "description": description,
                    "merchant_ref": order_id,
                    "customer_email": customer_email,
                    "success_url": success_url,
                    "failure_url": failure_url,
                    "locale": "el"
                },
                headers=self._get_auth_header()
            )
            response.raise_for_status()
            data = response.json()
            return {
                "payment_token": data["token"],
                "checkout_url": data["url"]
            }
    
    async def refund_payment(
        self,
        payment_token: str,
        amount_cents: Optional[int] = None
    ) -> dict:
        """Refund a payment (full or partial)."""
        data = {"payment_token": payment_token}
        if amount_cents:
            data["amount"] = amount_cents
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/refunds",
                data=data,
                headers=self._get_auth_header()
            )
            response.raise_for_status()
            return response.json()
