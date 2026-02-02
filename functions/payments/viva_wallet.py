import os
import httpx
from datetime import datetime, timedelta
from functools import lru_cache

class VivaWalletClient:
    """Viva Wallet API client with OAuth2 authentication."""
    
    DEMO_BASE_URL = "https://demo-api.vivapayments.com"
    PROD_BASE_URL = "https://api.vivapayments.com"
    
    def __init__(self):
        self.client_id = os.environ.get("VIVA_CLIENT_ID")
        self.client_secret = os.environ.get("VIVA_CLIENT_SECRET")
        self.merchant_id = os.environ.get("VIVA_MERCHANT_ID")
        self.is_production = os.environ.get("VIVA_ENVIRONMENT") == "production"
        self.base_url = self.PROD_BASE_URL if self.is_production else self.DEMO_BASE_URL
        self._access_token = None
        self._token_expires_at = None
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth2 access token with caching."""
        if self._access_token and self._token_expires_at and self._token_expires_at > datetime.utcnow():
            return self._access_token
        
        auth_url = f"{self.base_url}/connect/token"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                auth_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            data = response.json()
            
            self._access_token = data["access_token"]
            self._token_expires_at = datetime.utcnow() + timedelta(seconds=data["expires_in"] - 60)
            return self._access_token
    
    async def create_payment_order(
        self,
        amount_cents: int,
        order_id: str,
        customer_email: str,
        description: str,
        success_url: str,
        failure_url: str
    ) -> dict:
        """Create a payment order and return checkout URL."""
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/checkout/v2/orders",
                json={
                    "amount": amount_cents,  # Amount in cents
                    "customerTrns": description,
                    "customer": {
                        "email": customer_email,
                        "fullName": "",  # Optional
                        "requestLang": "el-GR"
                    },
                    "paymentTimeout": 1800,  # 30 minutes
                    "preauth": False,
                    "allowRecurring": False,
                    "maxInstallments": 0,
                    "paymentNotification": True,
                    "tipAmount": 0,
                    "disableExactAmount": False,
                    "disableCash": True,
                    "disableWallet": False,
                    "sourceCode": os.environ.get("VIVA_SOURCE_CODE"),
                    "merchantTrns": order_id,  # Your internal order ID
                    "tags": [order_id]
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Return checkout URL for redirect flow
            checkout_url = f"{'https://www.vivapayments.com' if self.is_production else 'https://demo.vivapayments.com'}/web/checkout?ref={data['orderCode']}"
            
            return {
                "order_code": str(data["orderCode"]),
                "checkout_url": checkout_url
            }
    
    async def get_transaction(self, transaction_id: str) -> dict:
        """Retrieve transaction details."""
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/checkout/v2/transactions/{transaction_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
    
    async def refund_transaction(
        self,
        transaction_id: str,
        amount_cents: int,
        source_code: str = None
    ) -> dict:
        """Process a refund for a transaction."""
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/checkout/v2/transactions/{transaction_id}",
                params={
                    "amount": amount_cents,
                    "sourceCode": source_code or os.environ.get("VIVA_SOURCE_CODE")
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
