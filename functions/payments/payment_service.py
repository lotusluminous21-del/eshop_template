from enum import Enum
from typing import Optional
from dataclasses import dataclass

from payments.viva_wallet import VivaWalletClient
from payments.stripe_client import StripeClient
from payments.everypay_client import EverypayClient

class PaymentProvider(Enum):
    VIVA_WALLET = "viva_wallet"
    STRIPE = "stripe"
    EVERYPAY = "everypay"

@dataclass
class PaymentResult:
    success: bool
    checkout_url: Optional[str] = None
    client_secret: Optional[str] = None  # For Stripe Elements
    payment_id: Optional[str] = None
    error: Optional[str] = None

class PaymentService:
    """Unified payment service supporting multiple providers."""
    
    def __init__(self):
        self.viva = VivaWalletClient()
        self.stripe = StripeClient()
        self.everypay = EverypayClient()
    
    async def create_payment(
        self,
        provider: PaymentProvider,
        amount_cents: int,
        order_id: str,
        customer_email: str,
        description: str,
        success_url: str,
        failure_url: str,
        use_embedded: bool = False  # For Stripe Elements
    ) -> PaymentResult:
        """Create a payment with the specified provider."""
        
        try:
            if provider == PaymentProvider.VIVA_WALLET:
                result = await self.viva.create_payment_order(
                    amount_cents=amount_cents,
                    order_id=order_id,
                    customer_email=customer_email,
                    description=description,
                    success_url=success_url,
                    failure_url=failure_url
                )
                return PaymentResult(
                    success=True,
                    checkout_url=result["checkout_url"],
                    payment_id=result["order_code"]
                )
            
            elif provider == PaymentProvider.STRIPE:
                if use_embedded:
                    result = StripeClient.create_payment_intent(
                        amount_cents=amount_cents,
                        metadata={"order_id": order_id},
                        customer_email=customer_email,
                        order_id=order_id
                    )
                    return PaymentResult(
                        success=True,
                        client_secret=result["client_secret"],
                        payment_id=result["payment_intent_id"]
                    )
                else:
                    result = StripeClient.create_checkout_session(
                        line_items=[{
                            "price_data": {
                                "currency": "eur",
                                "product_data": {
                                    "name": description
                                },
                                "unit_amount": amount_cents
                            },
                            "quantity": 1
                        }],
                        order_id=order_id,
                        success_url=success_url,
                        cancel_url=failure_url,
                        customer_email=customer_email
                    )
                    return PaymentResult(
                        success=True,
                        checkout_url=result["checkout_url"],
                        payment_id=result["session_id"]
                    )
            
            elif provider == PaymentProvider.EVERYPAY:
                result = await self.everypay.create_payment_link(
                    amount_cents=amount_cents,
                    order_id=order_id,
                    description=description,
                    success_url=success_url,
                    failure_url=failure_url,
                    customer_email=customer_email
                )
                return PaymentResult(
                    success=True,
                    checkout_url=result["checkout_url"],
                    payment_id=result["payment_token"]
                )
            
            else:
                return PaymentResult(success=False, error=f"Unsupported provider: {provider}")
                
        except Exception as e:
            return PaymentResult(success=False, error=str(e))
