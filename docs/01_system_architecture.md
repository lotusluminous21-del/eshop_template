# System Architecture Specification

## Document Overview

This document defines the complete system architecture for the headless e-commerce template infrastructure. It covers component relationships, data flows, API contracts, authentication patterns, and the per-client deployment model.

**Related Documents:**
- [02_frontend_integration.md](./02_frontend_integration.md) - Frontend implementation details
- [03_ai_systems.md](./03_ai_systems.md) - AI/ML system specifications

---

## 1. High-Level Architecture

### 1.1 System Components Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14+ Application                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ React 18+    │  │ Zustand      │  │ TanStack Query           │  │   │
│  │  │ Components   │  │ State Mgmt   │  │ Server State Cache       │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ ReactFire    │  │ Shopify      │  │ Vercel AI SDK            │  │   │
│  │  │ Firebase SDK │  │ Storefront   │  │ Chat Interface           │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│   Vercel Edge        │  │ Firebase        │  │ Shopify Storefront API      │
│   (Next.js Hosting)  │  │ Cloud Functions │  │ (GraphQL)                   │
│   - SSR/SSG          │  │ (Python)        │  │ - Products                  │
│   - API Routes       │  │ - Business Logic│  │ - Collections               │
│   - Middleware       │  │ - AI Processing │  │ - Cart                      │
│   - Edge Functions   │  │ - Integrations  │  │ - Inventory                 │
└──────────────────────┘  └─────────────────┘  └─────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│   Firestore          │  │ Firebase Auth   │  │ Firebase Storage            │
│   - User profiles    │  │ - User accounts │  │ - Product images            │
│   - Orders           │  │ - Sessions      │  │ - Catalogue uploads         │
│   - AI job queues    │  │ - Custom claims │  │ - Digital products          │
│   - Chat history     │  │                 │  │ - Generated assets          │
└──────────────────────┘  └─────────────────┘  └─────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│   Payment Gateways   │  │ AADE myDATA     │  │ Google AI Platform          │
│   - Viva Wallet      │  │ - Invoice XML   │  │ - Gemini Models             │
│   - Stripe           │  │ - Transmission  │  │ - Vector Search             │
│   - Everypay         │  │ - Validation    │  │ - ADK Agents                │
└──────────────────────┘  └─────────────────┘  └─────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Next.js Frontend** | UI rendering, client state, API orchestration | Next.js 14+, React 18+, TypeScript |
| **Firebase Functions** | Business logic, external integrations, AI processing | Python 3.11+, Google ADK |
| **Firestore** | Persistent data storage, real-time sync | Firebase Firestore |
| **Firebase Auth** | User authentication, session management | Firebase Authentication |
| **Shopify Storefront** | Product catalog, inventory, cart, checkout | GraphQL API |
| **Payment Gateways** | Payment processing, refunds | REST APIs |
| **AADE myDATA** | Greek tax compliance, e-invoicing | SOAP/REST API |
| **Google AI** | Catalogue ingestion, buyer assistant | Gemini, ADK, Vector Search |

---

## 2. Data Flow Architecture

### 2.1 Product Browsing Flow

```
User Request → Next.js Server Component → Shopify Storefront API (GraphQL)
                                       ↓
                              TanStack Query Cache
                                       ↓
                              React Component Render
```

**Implementation Pattern:**
```typescript
// app/products/[handle]/page.tsx (Server Component)
import { createStorefrontApiClient } from '@shopify/storefront-api-client';

export default async function ProductPage({ params }: { params: { handle: string } }) {
  const client = createStorefrontApiClient({
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
    apiVersion: '2024-01',
    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN!,
  });

  const { data } = await client.request(PRODUCT_QUERY, {
    variables: { handle: params.handle }
  });

  return <ProductDisplay product={data.product} />;
}
```

### 2.2 Cart Operations Flow

```
User Action → React Component → Shopify Cart API (GraphQL)
                             ↓
                    Zustand Store Update (optimistic)
                             ↓
                    TanStack Query Invalidation
                             ↓
                    UI Re-render with confirmed state
```

### 2.3 Checkout & Payment Flow

```
Cart Complete → Firebase Function: initializeCheckout
                        ↓
              Create Shopify Checkout URL
                        ↓
              Initialize Payment Gateway Session
                        ↓
              Return checkout URL to frontend
                        ↓
User completes payment on gateway
                        ↓
Payment Webhook → Firebase Function: handlePaymentWebhook
                        ↓
              Verify payment signature
                        ↓
              Update Firestore order status
                        ↓
              Trigger AADE myDATA submission (if Greek client)
                        ↓
              Send confirmation email
                        ↓
              Notify Shopify of fulfillment status
```

### 2.4 AI Catalogue Ingestion Flow

```
Admin uploads file → Firebase Storage
                          ↓
              Storage trigger → Firebase Function: processCatalogueUpload
                          ↓
              Create job record in Firestore (status: pending)
                          ↓
              Google ADK Agent processes file
                          ↓
              Extract product data using Gemini
                          ↓
              Map to Shopify schema
                          ↓
              Validate and flag issues
                          ↓
              Update Firestore (status: review_required)
                          ↓
              Admin reviews in UI
                          ↓
              Firebase Function: publishProducts → Shopify Admin API
                          ↓
              Update Firestore (status: completed)
```

### 2.5 AI Buyer Assistant Flow

```
User message → Vercel AI SDK (useChat) → Firebase Function: chatAssistant
                                                  ↓
                                        Load conversation context from Firestore
                                                  ↓
                                        FileSearchTool RAG query (product catalog)
                                                  ↓
                                        Gemini generates response
                                                  ↓
                                        Stream response via SSE
                                                  ↓
                                        Save to Firestore conversation history
                                                  ↓
                                        Frontend renders streaming response
```

---

## 3. API Boundaries and Contracts

### 3.1 Firebase Callable Functions

All business logic is exposed via Firebase Callable Functions. These provide automatic authentication context and type-safe request/response handling.

#### Function Registry

| Function Name | Purpose | Auth Required | Rate Limit |
|--------------|---------|---------------|------------|
| `initializeCheckout` | Create checkout session | Yes | 10/min/user |
| `processPaymentWebhook` | Handle payment callbacks | No (signature verified) | 100/min |
| `submitInvoice` | AADE myDATA submission | Yes (admin) | 5/min |
| `startCatalogueIngestion` | Begin AI processing | Yes (admin) | 2/min |
| `getCatalogueJobStatus` | Poll job progress | Yes (admin) | 60/min |
| `publishProducts` | Push to Shopify | Yes (admin) | 5/min |
| `chatAssistant` | AI buyer assistant | Yes | 30/min/user |
| `getUserOrders` | Fetch order history | Yes | 30/min/user |

#### Function Contract Example

```python
# functions/main.py
from firebase_functions import https_fn, options
from firebase_admin import firestore, auth
import json

@https_fn.on_call(
    region="europe-west1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=60
)
def initialize_checkout(req: https_fn.CallableRequest) -> dict:
    """
    Initialize checkout session with payment gateway.
    
    Request:
    {
        "cartId": "gid://shopify/Cart/abc123",
        "paymentMethod": "viva_wallet" | "stripe" | "everypay",
        "billingAddress": { ... },
        "shippingAddress": { ... }
    }
    
    Response:
    {
        "success": true,
        "checkoutUrl": "https://...",
        "orderId": "order_xyz",
        "expiresAt": "2024-01-01T12:00:00Z"
    }
    
    Errors:
    - UNAUTHENTICATED: User not logged in
    - INVALID_ARGUMENT: Missing or invalid cart/address
    - FAILED_PRECONDITION: Cart is empty or items unavailable
    """
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="Authentication required"
        )
    
    # Implementation...
    return {"success": True, "checkoutUrl": checkout_url, "orderId": order_id}
```

### 3.2 REST Endpoints (Next.js API Routes)

For webhooks and external service callbacks that cannot use Firebase Callable Functions.

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/webhooks/shopify` | POST | Shopify order/inventory updates | HMAC signature |
| `/api/webhooks/payment/[provider]` | POST | Payment gateway callbacks | Provider-specific |
| `/api/ai/chat` | POST | AI assistant (streaming) | Firebase ID token |

#### Webhook Handler Example

```typescript
// app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
  
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(body)
    .digest('base64');
  
  if (hash !== hmac) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const payload = JSON.parse(body);
  const topic = request.headers.get('X-Shopify-Topic');
  
  // Process webhook based on topic
  switch (topic) {
    case 'orders/create':
      await handleOrderCreated(payload);
      break;
    case 'inventory_levels/update':
      await handleInventoryUpdate(payload);
      break;
  }
  
  return NextResponse.json({ received: true });
}
```

### 3.3 Shopify Storefront API Queries

Key GraphQL operations for the frontend:

```graphql
# Product Query
query GetProduct($handle: String!) {
  product(handle: $handle) {
    id
    title
    description
    descriptionHtml
    handle
    productType
    vendor
    tags
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    images(first: 10) {
      edges {
        node { url altText width height }
      }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          availableForSale
          quantityAvailable
          price { amount currencyCode }
          selectedOptions { name value }
          image { url altText }
        }
      }
    }
    metafields(identifiers: [
      { namespace: "custom", key: "specifications" },
      { namespace: "custom", key: "digital_download" }
    ]) {
      key
      value
      type
    }
  }
}

# Cart Mutations
mutation CartCreate($input: CartInput!) {
  cartCreate(input: $input) {
    cart { ...CartFragment }
    userErrors { field message }
  }
}

mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { ...CartFragment }
    userErrors { field message }
  }
}

mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { ...CartFragment }
    userErrors { field message }
  }
}

mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart { ...CartFragment }
    userErrors { field message }
  }
}
```

---

## 4. Authentication and Authorization

### 4.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Authentication Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Firebase     │───▶│ ID Token     │───▶│ Next.js Middleware       │  │
│  │ Auth SDK     │    │ (JWT)        │    │ (Route Protection)       │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                        │                  │
│         ▼                   ▼                        ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │ Auth State   │    │ Custom       │    │ Firebase Functions       │  │
│  │ (ReactFire)  │    │ Claims       │    │ (Auto-verified)          │  │
│  └──────────────┘    │ (roles)      │    └──────────────────────────┘  │
│                      └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 User Roles and Permissions

```typescript
// types/auth.ts
export type UserRole = 'customer' | 'staff' | 'admin' | 'super_admin';

export interface CustomClaims {
  role: UserRole;
  clientId: string;  // For multi-tenant isolation
  permissions: string[];
}

// Permission matrix
export const PERMISSIONS = {
  customer: [
    'read:products',
    'write:cart',
    'read:own_orders',
    'write:own_profile',
    'use:chat_assistant'
  ],
  staff: [
    'read:products',
    'read:all_orders',
    'write:order_status',
    'read:customers'
  ],
  admin: [
    'read:products',
    'write:products',
    'read:all_orders',
    'write:all_orders',
    'manage:catalogue_ingestion',
    'manage:invoices',
    'read:analytics'
  ],
  super_admin: ['*']  // All permissions
} as const;
```

### 4.3 Next.js Middleware Implementation

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = {
  '/account': ['customer', 'staff', 'admin'],
  '/account/orders': ['customer', 'staff', 'admin'],
  '/admin': ['admin', 'super_admin'],
  '/admin/catalogue': ['admin', 'super_admin'],
  '/admin/orders': ['staff', 'admin', 'super_admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route requires protection
  const requiredRoles = Object.entries(PROTECTED_ROUTES)
    .find(([route]) => pathname.startsWith(route))?.[1];
  
  if (!requiredRoles) {
    return NextResponse.next();
  }
  
  // Get Firebase session cookie
  const session = request.cookies.get('__session')?.value;
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token via Firebase Admin (in API route or edge function)
  // For edge compatibility, use a lightweight JWT verification
  // or call a verification endpoint
  
  try {
    const claims = await verifySessionToken(session);
    
    if (!requiredRoles.includes(claims.role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // Add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set('x-user-id', claims.uid);
    response.headers.set('x-user-role', claims.role);
    return response;
    
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*']
};
```

### 4.4 Firebase Function Authorization

```python
# functions/utils/auth.py
from firebase_admin import auth
from firebase_functions import https_fn

def require_role(*allowed_roles):
    """Decorator to enforce role-based access control."""
    def decorator(func):
        def wrapper(req: https_fn.CallableRequest):
            if not req.auth:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
                    message="Authentication required"
                )
            
            # Get custom claims
            user = auth.get_user(req.auth.uid)
            role = user.custom_claims.get('role', 'customer')
            
            if role not in allowed_roles and 'super_admin' not in allowed_roles:
                raise https_fn.HttpsError(
                    code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    message=f"Role '{role}' not authorized for this action"
                )
            
            return func(req)
        return wrapper
    return decorator

# Usage
@https_fn.on_call()
@require_role('admin', 'super_admin')
def start_catalogue_ingestion(req: https_fn.CallableRequest):
    # Only admins can trigger catalogue ingestion
    pass
```

---

## 5. Per-Client Deployment Model

### 5.1 Template Cloning Process

Each client receives isolated infrastructure through a standardized cloning process:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Template Cloning Workflow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. PROVISION INFRASTRUCTURE                                            │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Create new Firebase project (client-name-prod)             │   │
│     │ • Enable Firestore, Auth, Storage, Functions                 │   │
│     │ • Create Shopify store or connect existing                   │   │
│     │ • Configure payment gateway accounts                         │   │
│     │ • Set up AADE credentials (if Greek client)                  │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  2. CLONE CODEBASE                                                      │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Fork template repository                                   │   │
│     │ • Update package.json with client name                       │   │
│     │ • Configure environment variables                            │   │
│     │ • Customize branding (logo, colors, fonts)                   │   │
│     │ • Configure AI assistant persona                             │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  3. DEPLOY                                                              │
│     ┌──────────────────────────────────────────────────────────────┐   │
│     │ • Deploy Firebase Functions                                  │   │
│     │ • Deploy to Vercel (connect to client's domain)              │   │
│     │ • Configure Shopify webhooks                                 │   │
│     │ • Set up monitoring and alerts                               │   │
│     └──────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Environment Configuration

```bash
# .env.local (per-client configuration)

# Client Identification
NEXT_PUBLIC_CLIENT_ID=client-acme-corp
NEXT_PUBLIC_CLIENT_NAME="ACME Corporation"
NEXT_PUBLIC_SITE_URL=https://shop.acme-corp.com

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=acme-corp-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=acme-corp-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=acme-corp-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (server-side only)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Shopify Configuration
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=acme-corp.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=shpat_...
SHOPIFY_ADMIN_API_TOKEN=shpat_admin_...
SHOPIFY_WEBHOOK_SECRET=whsec_...

# Payment Gateways
VIVA_WALLET_MERCHANT_ID=...
VIVA_WALLET_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EVERYPAY_API_KEY=...

# AADE myDATA (Greek clients only)
AADE_USER_ID=...
AADE_SUBSCRIPTION_KEY=...
AADE_ENVIRONMENT=production  # or 'sandbox'

# AI Configuration
GOOGLE_AI_API_KEY=...
AI_ASSISTANT_PERSONA="friendly Greek shop assistant"
AI_ASSISTANT_LANGUAGE=el  # or 'en'
```

### 5.3 Multi-Tenant Data Isolation

```typescript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user's client ID
    function getUserClientId() {
      return request.auth.token.clientId;
    }
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Orders are scoped to client and user
    match /clients/{clientId}/orders/{orderId} {
      allow read: if request.auth != null && 
                    getUserClientId() == clientId &&
                    (resource.data.userId == request.auth.uid ||
                     request.auth.token.role in ['staff', 'admin']);
      allow write: if request.auth != null &&
                     getUserClientId() == clientId &&
                     request.auth.token.role in ['admin'];
    }
    
    // AI jobs are admin-only within client scope
    match /clients/{clientId}/ai_jobs/{jobId} {
      allow read, write: if request.auth != null &&
                           getUserClientId() == clientId &&
                           request.auth.token.role in ['admin'];
    }
    
    // Chat sessions belong to individual users
    match /clients/{clientId}/chat_sessions/{sessionId} {
      allow read, write: if request.auth != null &&
                           getUserClientId() == clientId &&
                           resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 6. Infrastructure Overview

### 6.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Production Infrastructure                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  VERCEL (Frontend Hosting)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ • Next.js application (SSR/SSG/ISR)                             │   │
│  │ • Edge Functions (middleware, lightweight APIs)                  │   │
│  │ • CDN for static assets                                         │   │
│  │ • Automatic HTTPS and domain management                         │   │
│  │ • Preview deployments for PRs                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  FIREBASE (Backend Services)                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Cloud Functions (europe-west1)                                  │   │
│  │ • Python 3.11 runtime                                           │   │
│  │ • 512MB - 2GB memory per function                               │   │
│  │ • Auto-scaling (0 to 1000 instances)                            │   │
│  │ • Cold start optimization via min instances                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Firestore (europe-west1)                                        │   │
│  │ • Native mode                                                   │   │
│  │ • Automatic scaling                                             │   │
│  │ • Real-time listeners                                           │   │
│  │ • Composite indexes for complex queries                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Firebase Auth                                                   │   │
│  │ • Email/password authentication                                 │   │
│  │ • Google OAuth                                                  │   │
│  │ • Custom claims for roles                                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Cloud Storage                                                   │   │
│  │ • Product images                                                │   │
│  │ • Catalogue uploads                                             │   │
│  │ • Digital product files (with signed URLs)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  EXTERNAL SERVICES                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Shopify: Product catalog, inventory, checkout                   │   │
│  │ Google AI: Gemini models, vector search                         │   │
│  │ Payment Gateways: Transaction processing                        │   │
│  │ AADE myDATA: Greek tax compliance                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Scaling Considerations

| Component | Scaling Strategy | Limits |
|-----------|-----------------|--------|
| **Vercel** | Automatic, serverless | 100 concurrent executions (Pro) |
| **Cloud Functions** | Auto-scale 0-1000 instances | 60s timeout (configurable to 540s) |
| **Firestore** | Automatic | 10,000 writes/sec, 1M concurrent connections |
| **Shopify API** | Rate limited | 2 requests/sec (Storefront), bucket system |
| **AI Processing** | Queue-based | Gemini: 60 RPM, 1M TPM |

### 6.3 Monitoring and Observability

```typescript
// lib/monitoring.ts
import { getAnalytics, logEvent } from 'firebase/analytics';
import * as Sentry from '@sentry/nextjs';

export const trackEvent = (name: string, params?: Record<string, any>) => {
  // Firebase Analytics
  const analytics = getAnalytics();
  logEvent(analytics, name, params);
  
  // Custom metrics to Cloud Monitoring (via API route)
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, params, timestamp: Date.now() })
  });
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, { extra: context });
};

// Key metrics to track
export const METRICS = {
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  PAYMENT_FAILED: 'payment_failed',
  AI_CHAT_MESSAGE: 'ai_chat_message',
  CATALOGUE_UPLOAD: 'catalogue_upload',
  PRODUCT_VIEW: 'product_view',
  ADD_TO_CART: 'add_to_cart',
};
```

---

## 7. Error Handling and Recovery

### 7.1 Error Categories

| Category | Examples | Handling Strategy |
|----------|----------|-------------------|
| **Transient** | Network timeout, rate limit | Exponential backoff retry |
| **Client Error** | Invalid input, auth failure | Return clear error message |
| **Server Error** | Database failure, API down | Log, alert, graceful degradation |
| **Business Logic** | Out of stock, payment declined | User-friendly message, alternatives |

### 7.2 Retry Configuration

```python
# functions/utils/retry.py
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((requests.Timeout, requests.ConnectionError))
)
def call_external_api(url: str, payload: dict) -> dict:
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()
```

### 7.3 Circuit Breaker Pattern

```python
# functions/utils/circuit_breaker.py
from datetime import datetime, timedelta
from firebase_admin import firestore

class CircuitBreaker:
    def __init__(self, service_name: str, failure_threshold: int = 5, reset_timeout: int = 60):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.db = firestore.client()
    
    def is_open(self) -> bool:
        doc = self.db.collection('circuit_breakers').document(self.service_name).get()
        if not doc.exists:
            return False
        
        data = doc.to_dict()
        if data['failures'] >= self.failure_threshold:
            if datetime.now() - data['last_failure'] < timedelta(seconds=self.reset_timeout):
                return True
            else:
                # Reset circuit
                self.reset()
                return False
        return False
    
    def record_failure(self):
        ref = self.db.collection('circuit_breakers').document(self.service_name)
        ref.set({
            'failures': firestore.Increment(1),
            'last_failure': datetime.now()
        }, merge=True)
    
    def reset(self):
        self.db.collection('circuit_breakers').document(self.service_name).delete()
```

---

## 8. Security Considerations

### 8.1 Security Checklist

- [ ] All API keys stored in environment variables, never in code
- [ ] Firebase Security Rules enforce data isolation
- [ ] Webhook signatures verified before processing
- [ ] CORS configured to allow only known origins
- [ ] Rate limiting on all public endpoints
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React's default escaping + CSP headers)
- [ ] HTTPS enforced everywhere
- [ ] Sensitive data encrypted at rest (Firestore default)
- [ ] PCI compliance via payment gateway tokenization
- [ ] Regular dependency updates and security audits

### 8.2 Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.firebaseio.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.shopify.com wss://*.firebaseio.com;
      frame-src 'self' https://*.firebaseapp.com;
    `.replace(/\n/g, '')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Headless Commerce** | E-commerce architecture where frontend is decoupled from backend |
| **Storefront API** | Shopify's customer-facing GraphQL API |
| **Callable Function** | Firebase function invoked directly from client SDK |
| **Custom Claims** | JWT claims added to Firebase Auth tokens for authorization |
| **myDATA** | Greek tax authority's electronic invoicing system |
| **ADK** | Google's Agent Development Kit for building AI agents |
| **RAG** | Retrieval-Augmented Generation for AI responses |

---

## Appendix B: Related Resources

- [Shopify Storefront API Reference](https://shopify.dev/docs/api/storefront)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [AADE myDATA Technical Specifications](https://www.aade.gr/mydata)
