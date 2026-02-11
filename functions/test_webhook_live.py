import requests
import json
import os
import hmac
import hashlib
import base64
import time

# --- CONFIG ---
# Replace this with your actual deployed function URL
FUNCTION_URL = "https://europe-west1-pavlicevits-9a889.cloudfunctions.net/shopify_order_paid"

# Helper to sign payload
def sign_payload(payload_bytes, secret):
    digest = hmac.new(
        secret.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode('utf-8')

def test_live_webhook():
    print(f"Testing Live Webhook: {FUNCTION_URL}")
    
    # 1. Get Secret
    # In a real scenario, this is the Shopify shared secret. 
    # For this test script to work, you need to provide the SAME secret you deployed to Firebase.
    secret = input("Enter SHOPIFY_WEBHOOK_SECRET to sign payload: ").strip()
    
    if not secret:
        print("Secret is required to generate valid signature.")
        return

    # 2. Mock Payload
    payload = {
        "id": 1234567890,
        "name": "#TEST-LIVE-001",
        "order_number": 1001,
        "currency": "EUR",
        "total_price": "124.00",
        "billing_address": {
            "first_name": "Live",
            "last_name": "TestUser",
            "company": "Test Business SA",
            "address1": "Leoforos Kifisias 100",
            "city": "Athens",
            "zip": "11526",
            "country_code": "GR"
        },
        "note_attributes": [
            {"name": "VAT Number", "value": "EL123456789"}
        ],
        "line_items": [
            {
                "id": 1,
                "price": "100.00",
                "quantity": 1,
                "title": "Test Product Live"
            }
        ]
    }
    
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    # 3. Generate Signature
    signature = sign_payload(payload_bytes, secret)
    
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": signature,
        "X-Shopify-Topic": "orders/paid",
        "X-Shopify-Shop-Domain": "pavlicevits.myshopify.com"
    }
    
    print("\nSending request...")
    try:
        response = requests.post(FUNCTION_URL, data=payload_bytes, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("\n✅ Success! Check Firebase Logs in GCP Console.")
            print("You should see the AADE XML log for order #TEST-LIVE-001.")
        else:
            print("\n❌ Failed.")
            
    except Exception as e:
        print(f"Error sending request: {e}")

if __name__ == "__main__":
    test_live_webhook()
