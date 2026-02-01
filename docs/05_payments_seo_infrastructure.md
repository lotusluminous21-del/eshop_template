# 05: Payments, SEO & Infrastructure Guide

> **Related Documents:** [01_system_architecture.md](./01_system_architecture.md), [04_aade_mydata_compliance.md](./04_aade_mydata_compliance.md)

---

## Table of Contents

1. [Payment Gateway Integration](#payment-gateway-integration)
   - [Viva Wallet](#viva-wallet-integration)
   - [Stripe](#stripe-integration)
   - [Everypay](#everypay-integration)
   - [Common Patterns](#common-payment-patterns)
2. [SEO Infrastructure](#seo-infrastructure)
   - [Next.js Metadata API](#nextjs-metadata-api)
   - [Structured Data](#structured-data-schemaorg)
   - [Static Generation & ISR](#static-generation--isr)
   - [Sitemap & Robots](#sitemap--robots)
   - [AI Discoverability](#ai-discoverability-llmstxt)
   - [Social Cards](#open-graph--twitter-cards)
   - [Core Web Vitals](#core-web-vitals-optimization)

---

## Payment Gateway Integration

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Firebase Cloud  │────▶│ Payment Gateway │
│   (Checkout)    │     │    Functions     │     │  (Viva/Stripe)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         │
                        ┌──────────────┐                 │
                        │  Firestore   │◀────────────────┘
                        │  (Orders)    │     (Webhook confirmation)
                        └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ AADE myDATA  │
                        │  (Invoice)   │
                        └──────────────┘
```

### Payment Status Flow

```typescript
// types/payment.ts
import { z } from 'zod';

export const PaymentStatusSchema = z.enum([
  'pending',           // Payment initiated
  'processing',        // Gateway processing
  'requires_action',   // 3DS or additional auth needed
  'succeeded',         // Payment confirmed
  'failed',            // Payment failed
  'refunded',          // Full refund processed
  'partially_refunded' // Partial refund processed
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
```

---

## Viva Wallet Integration

Viva Wallet is the primary payment provider for Greek merchants, offering native IBAN support and local card processing.

### API Setup & Authentication

```python
# functions/payments/viva_wallet.py
import os
import httpx
from datetime import datetime, timedelta
from functools import lru_cache

class VivaWalletClient:
    """Viva Wallet API client with OAuth2 authentication."""
    
    DEMO_BASE_URL = "https://demo-api.vivapayments.com"
    PROD_BASE_URL = "https://api.vivapayments.com"
    
    def __init__(self):
        self.client_id = os.environ["VIVA_CLIENT_ID"]
        self.client_secret = os.environ["VIVA_CLIENT_SECRET"]
        self.merchant_id = os.environ["VIVA_MERCHANT_ID"]
        self.is_production = os.environ.get("VIVA_ENVIRONMENT") == "production"
        self.base_url = self.PROD_BASE_URL if self.is_production else self.DEMO_BASE_URL
        self._access_token = None
        self._token_expires_at = None
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth2 access token with caching."""
        if self._access_token and self._token_expires_at > datetime.utcnow():
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
                    "sourceCode": os.environ["VIVA_SOURCE_CODE"],
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
                "order_code": data["orderCode"],
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
                    "sourceCode": source_code or os.environ["VIVA_SOURCE_CODE"]
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
```

### Webhook Handling

```python
# functions/webhooks/viva_webhook.py
from firebase_functions import https_fn
from firebase_admin import firestore
import hashlib
import hmac
import json
from datetime import datetime

from payments.viva_wallet import VivaWalletClient
from aade.invoice_transmitter import transmit_invoice

@https_fn.on_request()
async def viva_webhook(req: https_fn.Request) -> https_fn.Response:
    """Handle Viva Wallet payment webhooks."""
    
    # Verify webhook signature
    signature = req.headers.get("X-Viva-Signature")
    if not verify_viva_signature(req.data, signature):
        return https_fn.Response("Invalid signature", status=401)
    
    payload = req.get_json()
    event_type = payload.get("EventTypeId")
    event_data = payload.get("EventData", {})
    
    db = firestore.client()
    
    # Event types: 1796 = Transaction Payment Created
    if event_type == 1796:
        transaction_id = event_data.get("TransactionId")
        order_code = event_data.get("OrderCode")
        merchant_trns = event_data.get("MerchantTrns")  # Our order ID
        status_id = event_data.get("StatusId")
        
        # Status: F = completed, E = failed
        if status_id == "F":
            # Update order in Firestore
            order_ref = db.collection("orders").document(merchant_trns)
            order_ref.update({
                "payment_status": "succeeded",
                "payment_provider": "viva_wallet",
                "payment_transaction_id": transaction_id,
                "payment_confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            # Trigger AADE invoice transmission
            order_data = order_ref.get().to_dict()
            await transmit_invoice(order_data)
            
        elif status_id == "E":
            order_ref = db.collection("orders").document(merchant_trns)
            order_ref.update({
                "payment_status": "failed",
                "payment_error": event_data.get("ErrorText"),
                "updated_at": datetime.utcnow()
            })
    
    return https_fn.Response("OK", status=200)


def verify_viva_signature(payload: bytes, signature: str) -> bool:
    """Verify Viva Wallet webhook signature."""
    webhook_key = os.environ["VIVA_WEBHOOK_KEY"]
    expected = hmac.new(
        webhook_key.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

### Frontend Checkout Flow

```typescript
// app/checkout/actions.ts
'use server';

import { redirect } from 'next/navigation';

export async function initiateVivaPayment(orderId: string) {
  const response = await fetch(
    `${process.env.FIREBASE_FUNCTIONS_URL}/createVivaPayment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to create payment');
  }
  
  const { checkout_url } = await response.json();
  redirect(checkout_url);
}
```

---

## Stripe Integration

### Setup with Payment Intents

```python
# functions/payments/stripe_client.py
import os
import stripe
from typing import Optional

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

class StripeClient:
    """Stripe payment client using Payment Intents API."""
    
    @staticmethod
    async def create_payment_intent(
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
    async def create_checkout_session(
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
    async def refund_payment(
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
```

### Stripe Webhook Handler

```python
# functions/webhooks/stripe_webhook.py
from firebase_functions import https_fn
from firebase_admin import firestore
import stripe
import os
from datetime import datetime

from aade.invoice_transmitter import transmit_invoice

@https_fn.on_request()
async def stripe_webhook(req: https_fn.Request) -> https_fn.Response:
    """Handle Stripe webhooks."""
    
    payload = req.data
    sig_header = req.headers.get("Stripe-Signature")
    webhook_secret = os.environ["STRIPE_WEBHOOK_SECRET"]
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return https_fn.Response("Invalid payload", status=400)
    except stripe.error.SignatureVerificationError:
        return https_fn.Response("Invalid signature", status=401)
    
    db = firestore.client()
    
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        order_id = payment_intent["metadata"].get("order_id")
        
        if order_id:
            order_ref = db.collection("orders").document(order_id)
            order_ref.update({
                "payment_status": "succeeded",
                "payment_provider": "stripe",
                "payment_intent_id": payment_intent["id"],
                "payment_confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            # Trigger AADE invoice
            order_data = order_ref.get().to_dict()
            await transmit_invoice(order_data)
    
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        order_id = payment_intent["metadata"].get("order_id")
        
        if order_id:
            order_ref = db.collection("orders").document(order_id)
            order_ref.update({
                "payment_status": "failed",
                "payment_error": payment_intent.get("last_payment_error", {}).get("message"),
                "updated_at": datetime.utcnow()
            })
    
    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        payment_intent_id = charge["payment_intent"]
        
        # Find order by payment_intent_id
        orders = db.collection("orders").where(
            "payment_intent_id", "==", payment_intent_id
        ).limit(1).get()
        
        for order in orders:
            refund_status = "refunded" if charge["refunded"] else "partially_refunded"
            order.reference.update({
                "payment_status": refund_status,
                "refund_amount": charge["amount_refunded"],
                "updated_at": datetime.utcnow()
            })
    
    return https_fn.Response("OK", status=200)
```

### Frontend Stripe Elements

```typescript
// components/checkout/StripePaymentForm.tsx
'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  orderId: string;
}

function PaymentForm({ clientSecret, orderId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
      },
    });

    if (submitError) {
      setError(submitError.message ?? 'Payment failed');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}

export function StripePaymentWrapper({ clientSecret, orderId }: PaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0f172a',
          },
        },
      }}
    >
      <PaymentForm clientSecret={clientSecret} orderId={orderId} />
    </Elements>
  );
}
```

---

## Everypay Integration

### API Client

```python
# functions/payments/everypay_client.py
import os
import httpx
import base64
from typing import Optional

class EverypayClient:
    """Everypay payment client for Greek market."""
    
    SANDBOX_URL = "https://sandbox-api.everypay.gr"
    PROD_URL = "https://api.everypay.gr"
    
    def __init__(self):
        self.secret_key = os.environ["EVERYPAY_SECRET_KEY"]
        self.public_key = os.environ["EVERYPAY_PUBLIC_KEY"]
        self.is_production = os.environ.get("EVERYPAY_ENVIRONMENT") == "production"
        self.base_url = self.PROD_URL if self.is_production else self.SANDBOX_URL
    
    def _get_auth_header(self) -> dict:
        """Generate Basic Auth header."""
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
```

### Everypay Webhook Handler

```python
# functions/webhooks/everypay_webhook.py
from firebase_functions import https_fn
from firebase_admin import firestore
import hmac
import hashlib
import os
from datetime import datetime

from aade.invoice_transmitter import transmit_invoice

@https_fn.on_request()
async def everypay_webhook(req: https_fn.Request) -> https_fn.Response:
    """Handle Everypay webhooks."""
    
    # Verify signature
    signature = req.headers.get("X-Everypay-Signature")
    if not verify_everypay_signature(req.data, signature):
        return https_fn.Response("Invalid signature", status=401)
    
    payload = req.get_json()
    event_type = payload.get("type")
    data = payload.get("data", {})
    
    db = firestore.client()
    
    if event_type == "payment.succeeded":
        order_id = data.get("merchant_ref")
        payment_token = data.get("token")
        
        order_ref = db.collection("orders").document(order_id)
        order_ref.update({
            "payment_status": "succeeded",
            "payment_provider": "everypay",
            "payment_token": payment_token,
            "payment_confirmed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Trigger AADE invoice
        order_data = order_ref.get().to_dict()
        await transmit_invoice(order_data)
    
    elif event_type == "payment.failed":
        order_id = data.get("merchant_ref")
        order_ref = db.collection("orders").document(order_id)
        order_ref.update({
            "payment_status": "failed",
            "payment_error": data.get("error", {}).get("message"),
            "updated_at": datetime.utcnow()
        })
    
    return https_fn.Response("OK", status=200)


def verify_everypay_signature(payload: bytes, signature: str) -> bool:
    """Verify Everypay webhook signature."""
    secret = os.environ["EVERYPAY_WEBHOOK_SECRET"]
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Common Payment Patterns

### Unified Payment Service

```python
# functions/payments/payment_service.py
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
                    result = await self.stripe.create_payment_intent(
                        amount_cents=amount_cents,
                        order_id=order_id,
                        customer_email=customer_email
                    )
                    return PaymentResult(
                        success=True,
                        client_secret=result["client_secret"],
                        payment_id=result["payment_intent_id"]
                    )
                else:
                    result = await self.stripe.create_checkout_session(
                        line_items=[{
                            "price_data": {
                                "currency": "eur",
                                "unit_amount": amount_cents,
                                "product_data": {"name": description}
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
        
        except Exception as e:
            return PaymentResult(success=False, error=str(e))
    
    async def process_refund(
        self,
        provider: PaymentProvider,
        payment_id: str,
        amount_cents: Optional[int] = None
    ) -> PaymentResult:
        """Process a refund across any provider."""
        
        try:
            if provider == PaymentProvider.VIVA_WALLET:
                result = await self.viva.refund_transaction(payment_id, amount_cents)
            elif provider == PaymentProvider.STRIPE:
                result = await self.stripe.refund_payment(payment_id, amount_cents)
            elif provider == PaymentProvider.EVERYPAY:
                result = await self.everypay.refund_payment(payment_id, amount_cents)
            
            return PaymentResult(success=True, payment_id=result.get("refund_id"))
        
        except Exception as e:
            return PaymentResult(success=False, error=str(e))
```

### Payment Audit Trail (Firestore)

```python
# functions/payments/audit.py
from firebase_admin import firestore
from datetime import datetime
from typing import Optional

async def log_payment_event(
    order_id: str,
    event_type: str,
    provider: str,
    amount_cents: int,
    status: str,
    transaction_id: Optional[str] = None,
    error: Optional[str] = None,
    raw_payload: Optional[dict] = None
):
    """Log payment events for audit trail and debugging."""
    db = firestore.client()
    
    event = {
        "order_id": order_id,
        "event_type": event_type,  # created, succeeded, failed, refunded
        "provider": provider,
        "amount_cents": amount_cents,
        "status": status,
        "transaction_id": transaction_id,
        "error": error,
        "raw_payload": raw_payload,
        "created_at": datetime.utcnow()
    }
    
    # Store in subcollection for easy querying
    db.collection("orders").document(order_id)\
      .collection("payment_events").add(event)
    
    # Also store in global audit log
    db.collection("payment_audit_log").add(event)
```

### AADE Integration Trigger

```python
# functions/payments/aade_trigger.py
from aade.invoice_transmitter import transmit_invoice
from firebase_admin import firestore

async def on_payment_confirmed(order_id: str):
    """
    Trigger AADE invoice transmission after payment confirmation.
    See 04_aade_mydata_compliance.md for full implementation.
    """
    db = firestore.client()
    order_ref = db.collection("orders").document(order_id)
    order_data = order_ref.get().to_dict()
    
    # Only transmit if payment succeeded and invoice not yet sent
    if order_data.get("payment_status") == "succeeded" and not order_data.get("aade_mark"):
        result = await transmit_invoice(order_data)
        
        if result.success:
            order_ref.update({
                "aade_mark": result.mark,
                "aade_uid": result.uid,
                "aade_transmitted_at": datetime.utcnow()
            })
        else:
            # Queue for retry
            order_ref.update({
                "aade_transmission_error": result.error,
                "aade_retry_count": firestore.Increment(1)
            })
```

### PCI Compliance Considerations

```markdown
## PCI DSS Compliance Notes

1. **Never store raw card data** - Use tokenization (Stripe Elements, Viva Smart Checkout)
2. **Use HTTPS everywhere** - All payment pages must be served over TLS
3. **Webhook verification** - Always verify webhook signatures
4. **Minimal data retention** - Store only transaction IDs, not card details
5. **Access logging** - Log all access to payment-related functions
6. **Environment separation** - Use separate API keys for test/production

### Recommended Architecture
- Frontend: Collect card details via provider's hosted fields/elements
- Backend: Only handle tokens, never raw card numbers
- Firestore: Store transaction references, not payment details
```

---

## SEO Infrastructure

### Next.js Metadata API

```typescript
// app/products/[handle]/page.tsx
import { Metadata } from 'next';
import { getProduct } from '@/lib/shopify';
import { notFound } from 'next/navigation';

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.handle);
  
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }
  
  const { title, description, featuredImage, priceRange } = product;
  const price = priceRange.minVariantPrice;
  
  return {
    title: `${title} | Your Store`,
    description: description?.substring(0, 160) || `Shop ${title}`,
    
    openGraph: {
      title,
      description: description || undefined,
      type: 'website',
      url: `https://yourstore.gr/products/${params.handle}`,
      images: featuredImage ? [
        {
          url: featuredImage.url,
          width: 1200,
          height: 630,
          alt: featuredImage.altText || title,
        }
      ] : undefined,
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: featuredImage ? [featuredImage.url] : undefined,
    },
    
    alternates: {
      canonical: `https://yourstore.gr/products/${params.handle}`,
    },
    
    other: {
      'product:price:amount': price.amount,
      'product:price:currency': price.currencyCode,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.handle);
  if (!product) notFound();
  
  return <ProductDisplay product={product} />;
}
```

### Collection Metadata

```typescript
// app/collections/[handle]/page.tsx
import { Metadata } from 'next';
import { getCollection } from '@/lib/shopify';

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollection(params.handle);
  
  if (!collection) {
    return { title: 'Collection Not Found' };
  }
  
  return {
    title: `${collection.title} | Your Store`,
    description: collection.description || `Browse our ${collection.title} collection`,
    
    openGraph: {
      title: collection.title,
      description: collection.description || undefined,
      type: 'website',
      url: `https://yourstore.gr/collections/${params.handle}`,
      images: collection.image ? [
        {
          url: collection.image.url,
          width: 1200,
          height: 630,
          alt: collection.image.altText || collection.title,
        }
      ] : undefined,
    },
  };
}
```

---

## Structured Data (Schema.org)

### Product Schema Component

```typescript
// components/seo/ProductSchema.tsx
import { Product } from '@/types/shopify';

interface ProductSchemaProps {
  product: Product;
  url: string;
}

export function ProductSchema({ product, url }: ProductSchemaProps) {
  const { title, description, featuredImage, priceRange, variants } = product;
  const price = priceRange.minVariantPrice;
  
  // Determine availability
  const inStock = variants.some(v => v.availableForSale);
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: description,
    image: featuredImage?.url,
    url: url,
    sku: variants[0]?.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.vendor || 'Your Store',
    },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: price.currencyCode,
      price: price.amount,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Your Store',
      },
    },
  };
  
  // Add aggregate rating if reviews exist
  if (product.reviews?.averageRating) {
    schema['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: product.reviews.averageRating,
      reviewCount: product.reviews.count,
    };
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Organization Schema

```typescript
// components/seo/OrganizationSchema.tsx
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Your Store',
    url: 'https://yourstore.gr',
    logo: 'https://www.pandoraagency.co/wp-content/uploads/2024/06/6-Tips-For-Creating-a-Unique-Brand-Name-and-Logo-1024x1024.jpg',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+30-210-1234567',
      contactType: 'customer service',
      availableLanguage: ['Greek', 'English'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ermou 123',
      addressLocality: 'Athens',
      postalCode: '10563',
      addressCountry: 'GR',
    },
    sameAs: [
      'https://facebook.com/yourstore',
      'https://instagram.com/yourstore',
    ],
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Breadcrumb Schema

```typescript
// components/seo/BreadcrumbSchema.tsx
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Usage in product page
<BreadcrumbSchema
  items={[
    { name: 'Home', url: 'https://yourstore.gr' },
    { name: collection.title, url: `https://yourstore.gr/collections/${collection.handle}` },
    { name: product.title, url: `https://yourstore.gr/products/${product.handle}` },
  ]}
/>
```

---

## Static Generation & ISR

### generateStaticParams for Products

```typescript
// app/products/[handle]/page.tsx
import { getAllProductHandles } from '@/lib/shopify';

export async function generateStaticParams() {
  const handles = await getAllProductHandles();
  
  return handles.map((handle) => ({
    handle,
  }));
}

// Enable ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
```

### On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  
  const { type, handle } = await request.json();
  
  if (type === 'product') {
    revalidatePath(`/products/${handle}`);
    revalidateTag('products');
  } else if (type === 'collection') {
    revalidatePath(`/collections/${handle}`);
    revalidateTag('collections');
  }
  
  return NextResponse.json({ revalidated: true });
}
```

---

## Sitemap & Robots

### Dynamic Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getAllProducts, getAllCollections } from '@/lib/shopify';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://yourstore.gr';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
  
  // Product pages
  const products = await getAllProducts();
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.handle}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  
  // Collection pages
  const collections = await getAllCollections();
  const collectionPages: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${baseUrl}/collections/${collection.handle}`,
    lastModified: new Date(collection.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
  
  return [...staticPages, ...productPages, ...collectionPages];
}
```

### Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://yourstore.gr';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/cart/',
          '/account/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

## AI Discoverability (llms.txt)

```typescript
// app/llms.txt/route.ts
import { NextResponse } from 'next/server';
import { getAllProducts, getAllCollections } from '@/lib/shopify';

export async function GET() {
  const products = await getAllProducts();
  const collections = await getAllCollections();
  
  const content = `# Your Store - AI Agent Guide

## Overview
Your Store is a Greek e-commerce platform selling [product category].
Website: https://yourstore.gr
Contact: info@yourstore.gr

## Available Actions

### Browse Products
- View all products: /products
- View by collection: /collections/[handle]
- Search products: /search?q=[query]

### Collections
${collections.map(c => `- ${c.title}: /collections/${c.handle}`).join('\n')}

### Product Information
Products include:
- Title, description, images
- Price in EUR
- Availability status
- Variants (size, color, etc.)

### Checkout Process
1. Add items to cart
2. Proceed to checkout
3. Enter shipping information
4. Select payment method (Viva Wallet, Stripe, Everypay)
5. Complete payment

### API Endpoints (for AI agents)
- GET /api/products - List all products
- GET /api/products/[handle] - Get product details
- GET /api/collections - List all collections
- POST /api/cart - Manage cart

### Contact
- Email: info@yourstore.gr
- Phone: +30-210-1234567
- Address: Ermou 123, Athens 10563, Greece

## Structured Data
All product pages include Schema.org Product markup.
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
```

---

## Open Graph & Twitter Cards

### Shared Image Generation (Optional)

```typescript
// app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Your Store';
  const price = searchParams.get('price');
  const image = searchParams.get('image');
  
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          padding: 40,
        }}
      >
        {image && (
          <img
            src={image}
            alt=""
            style={{ width: 400, height: 400, objectFit: 'contain' }}
          />
        )}
        <div style={{ fontSize: 48, fontWeight: 'bold', marginTop: 20 }}>
          {title}
        </div>
        {price && (
          <div style={{ fontSize: 36, color: '#16a34a', marginTop: 10 }}>
            €{price}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

---

## Core Web Vitals Optimization

### Image Optimization

```typescript
// components/ProductImage.tsx
import Image from 'next/image';

interface ProductImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export function ProductImage({ src, alt, priority = false }: ProductImageProps) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEQA/ANF6f1qC/wBPgmWKSNpI1cqwGRkA4/KKKKlZQGIBqTuf/9k="
      />
    </div>
  );
}
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'greek'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Performance Checklist

```markdown
## Core Web Vitals Checklist

### LCP (Largest Contentful Paint) < 2.5s
- [ ] Use Next.js Image component with priority for above-fold images
- [ ] Preload critical fonts
- [ ] Use CDN for static assets
- [ ] Implement ISR for product pages

### FID (First Input Delay) < 100ms
- [ ] Minimize JavaScript bundle size
- [ ] Use dynamic imports for non-critical components
- [ ] Defer third-party scripts (analytics, chat widgets)

### CLS (Cumulative Layout Shift) < 0.1
- [ ] Set explicit dimensions for images
- [ ] Reserve space for dynamic content
- [ ] Avoid inserting content above existing content

### Additional Optimizations
- [ ] Enable gzip/brotli compression
- [ ] Use HTTP/2 or HTTP/3
- [ ] Implement service worker for caching
- [ ] Lazy load below-fold images
- [ ] Use Suspense boundaries for loading states
```

### Loading States with Suspense

```typescript
// app/products/[handle]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
```

---

## Summary

This document covers the complete payment and SEO infrastructure for the headless e-commerce template:

| Component | Implementation |
|-----------|---------------|
| **Viva Wallet** | OAuth2 auth, redirect checkout, webhook handling |
| **Stripe** | Payment Intents, Elements, Checkout Sessions |
| **Everypay** | Token-based payments, hosted checkout |
| **AADE Integration** | Auto-trigger on payment confirmation |
| **SEO Metadata** | generateMetadata for all pages |
| **Structured Data** | Product, Organization, Breadcrumb schemas |
| **Sitemap** | Dynamic generation with ISR |
| **AI Discovery** | llms.txt for agent navigation |
| **Performance** | Image optimization, font loading, Suspense |

**Next:** See [06_data_contracts_roadmap.md](./06_data_contracts_roadmap.md) for data schemas and implementation phases.
