import os
import httpx
import logging
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShopifyClient:
    """Client for interacting with Shopify Admin API."""
    
    API_VERSION = "2024-01"

    def __init__(self):
        self.domain = os.environ.get("SHOPIFY_STORE_DOMAIN")
        self.token = os.environ.get("SHOPIFY_ADMIN_ACCESS_TOKEN")
        
        if not self.domain or not self.token:
            logger.warning("Shopify credentials not found in environment variables.")

        self.base_url = f"https://{self.domain}/admin/api/{self.API_VERSION}"

    def get_or_create_customer(self, email: str, first_name: str = "", last_name: str = "") -> Optional[Dict[str, Any]]:
        """
        Syncs a Firebase user to Shopify.
        Checks if customer exists by email. If yes, returns it.
        If no, creates a new customer.
        """
        if not self.domain or not self.token:
            return None
        
        headers = {
            "X-Shopify-Access-Token": self.token,
            "Content-Type": "application/json"
        }
        
        try:
            with httpx.Client() as client:
                # 1. Search for existing customer
                search_url = f"{self.base_url}/customers/search.json"
                logger.info(f"Searching for Shopify customer: {email}")
                
                response = client.get(
                    search_url, 
                    headers=headers, 
                    params={"query": f"email:{email}"}
                )
                response.raise_for_status()
                
                customers = response.json().get("customers", [])
                
                if customers:
                    customer = customers[0]
                    # Fetch detailed customer info (search results might be partial? usually full but let's be safe)
                    # For performance, we can just use the search result if it has addresses.
                    # Search result usually contains 'default_address' and 'addresses'.
                    
                    logger.info(f"Found existing Shopify customer ID: {customer['id']}")
                    return customer

                # 2. Create new customer
                logger.info(f"Creating new Shopify customer for {email}")
                create_url = f"{self.base_url}/customers.json"
                payload = {
                    "customer": {
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "verified_email": True,
                        "send_email_invite": False,
                        # Can't easily add address here without more info from user auth provider.
                        # Usually user signs up with just email/name.
                    }
                }
                
                response = client.post(create_url, json=payload, headers=headers)
                
            if response.status_code == 422:
                # Handle race condition or weak search match
                logger.warning(f"Shopify creation failed (422): {response.text}")
                return None
            
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP Error {e.response.status_code}: {e.response.text}")
                raise e
            
            customer = response.json().get("customer")
            logger.info(f"Created new Shopify user ID: {customer['id']}")
            return customer
                
        except Exception as e:
            logger.error(f"Error syncing customer to Shopify: {e}")
            return None
