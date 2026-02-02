import json
from firebase_functions import https_fn, options
from firebase_admin import firestore
import stripe

from payments.stripe_client import StripeClient

# Shared firestore client
db = firestore.client()

def handle_stripe_event(event: stripe.Event):
    """Business logic for Stripe events."""
    if event.type == 'payment_intent.succeeded':
        intent = event.data.object
        order_id = intent.metadata.get('order_id')
        
        if order_id:
            # Update Order
            print(f"Marking order {order_id} as PAID via Stripe")
            # db.collection('orders').document(order_id).update({'status': 'PAID'})
            
            # Trigger AADE
            # ...
    
    elif event.type == 'payment_intent.payment_failed':
        intent = event.data.object
        order_id = intent.metadata.get('order_id')
        print(f"Payment failed for order {order_id}: {intent.last_payment_error}")

def handle_viva_webhook_logic(req_body: dict):
    """Business logic for Viva Wallet events."""
    # Viva verifies via a verification token usually, or we verify the event structure
    # This is a simplified handler
    event_type = req_body.get('EventTypeId')
    
    if event_type == 1796: # Transaction Created/Success
        transaction_id = req_body.get('TransactionId')
        order_code = req_body.get('OrderCode')
        print(f"Viva Transaction {transaction_id} for OrderCode {order_code} Successful")
        # Logic to match OrderCode to internal Order ID and update DB

def handle_everypay_webhook_logic(req_body: dict):
    """Business logic for Everypay events."""
    payment_status = req_body.get('status')
    order_id = req_body.get('merchant_ref')
    
    if payment_status == 'Confirmed':
         print(f"Everypay payment confirmed for order {order_id}")
