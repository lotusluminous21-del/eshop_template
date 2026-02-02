import os
import stripe
from typing import Optional

# Initialize stripe with key from env, but handle case where env might not be loaded yet
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

class StripeClient:
    """Stripe payment client using Payment Intents API."""
    
    @staticmethod
    def create_payment_intent(
        amount_cents: int,
        currency: str = "eur",
        order_id: str = None,
        customer_email: str = None,
        metadata: dict = None
    ) -> dict:
        """Create a Payment Intent for client-side confirmation."""
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "order_id": order_id,
                **(metadata or {})
            },
            receipt_email=customer_email,
            description=f"Order {order_id}"
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
    
    @staticmethod
    def create_checkout_session(
        line_items: list,
        order_id: str,
        success_url: str,
        cancel_url: str,
        customer_email: str = None
    ) -> dict:
        """Create a Stripe Checkout Session for redirect flow."""
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            customer_email=customer_email,
            metadata={"order_id": order_id},
            payment_intent_data={
                "metadata": {"order_id": order_id}
            }
        )
        
        return {
            "session_id": session.id,
            "checkout_url": session.url
        }
    
    @staticmethod
    def refund_payment(
        payment_intent_id: str,
        amount_cents: Optional[int] = None,
        reason: str = "requested_by_customer"
    ) -> dict:
        """Process a refund."""
        refund_params = {
            "payment_intent": payment_intent_id,
            "reason": reason
        }
        if amount_cents:
            refund_params["amount"] = amount_cents
        
        refund = stripe.Refund.create(**refund_params)
        return {
            "refund_id": refund.id,
            "status": refund.status,
            "amount": refund.amount
        }
