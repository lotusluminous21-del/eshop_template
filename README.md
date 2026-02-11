# E-Shop Template (Next.js + Firebase + Shopify)

This is a **production-ready e-shop template** built with **Next.js 14**, **Firebase (Auth, Firestore, Functions)**, and **Shopify (Headless)**.

It features:
1.  **Hybrid Auth**: Users sign in via Firebase (Email/Google), but customers are automatically synced to Shopify.
2.  **AADE Integration**: Automated invoicing to the Greek Tax Authority via Shopify Webhooks (for Greek stores).
3.  **Artificial Intelligence**: Integrated Google Gemini AI for chat assistance and product recommendations.
4.  **Shopify Headless**: Uses Shopify for Product Management & Checkout, but Next.js for the Frontend experience.

---

## 🚀 Deployment Guide (Zero to Hero)

Follow this guide to deploy this template for a new client.

### 1. Prerequisites
-   **Node.js 18+** & **Python 3.10+**.
-   **Shopify Partner Account** (to create a new Development Store).
-   **Google Cloud / Firebase Project**.
-   **Stripe Account** (Optional, if using custom payments, though Shopify Payments is recommended).

---

### 2. Shopify Setup

#### A. Create Store & Products
1.  Create a new Shopify Store.
2.  Add some products.
3.  **Important**: Ensure your store currency matches your target market (e.g., EUR).

#### B. Headless Setup (Storefront API)
1.  Go to **Settings -> Apps and sales channels -> Develop apps**.
2.  Create an app named "Headless Front".
3.  **Configuration -> Storefront API Integration**:
    -   Select ALL scopes (check all boxes).
4.  **Install App**.
5.  **Copy the Storefront Access Token**.

#### C. Admin Setup (Admin API - For Backend)
1.  Create another app named "Firebase Backend".
2.  **Configuration -> Admin API Integration**:
    -   `read_customers`, `write_customers`
    -   `read_orders`, `write_orders` (For AADE)
    -   `read_products`
3.  **Install App**.
4.  **Copy the Admin API Access Token** (`shpat_...`).

#### D. Webhooks (For AADE)
1.  **Settings -> Notifications -> Webhooks**.
2.  Create `Order payment` (`orders/paid`) -> JSON -> `https://[REGION]-[PROJECT_ID].cloudfunctions.net/shopify_order_paid`.
3.  **Copy the Webhook Signing Secret**.

---

### 3. Google Cloud & Firebase Setup

#### A. Create Project
1.  Go to [Firebase Console](https://console.firebase.google.com/).
2.  Add project. Enable **Google Analytics**.
3.  **Build -> Authentication**:
    -   Enable **Email/Password**.
    -   Enable **Google** (Requires SHA-1 fingerprint from your local machine if testing locally, or just standard web setup).
4.  **Build -> Firestore Database**:
    -   Create Database (Production Mode).
    -   Location: `europe-west1` (or nearest).

#### B. Enable APIs (GCP Console)
Go to [Google Cloud Console](https://console.cloud.google.com/apis/library) for your project and enable:
-   **Cloud Functions API**
-   **Secret Manager API**
-   **Artifact Registry API**
-   **Cloud Build API**
-   **Generative Language API** (For Gemini AI)
-   **Identity Toolkit API**

---

### 4. Codebase Configuration

#### A. Frontend Variables (`.env.local`)
Duplicate `.env.example` to `.env.local` and fill in:

```bash
# Shopify (Headless)
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="<Storefront Access Token>"
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN="<Storefront Access Token>"

# Firebase (Client SDK)
# Get these from Firebase Console -> Project Settings -> General -> Web App
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="[PROJECT_ID].firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="[PROJECT_ID]"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="[PROJECT_ID].firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# AI & Features
NEXT_PUBLIC_ENABLE_AI="true"
# GOOGLE_AI_API_KEY="..." (Optional if using client-side AI, better on server)
```

#### B. Backend Variables (`functions/.env`)
Create `functions/.env`:

```bash
# General
AADE_ENVIRONMENT="development" # or "production"
AADE_USER_ID="<AADE User ID>"
AADE_SUBSCRIPTION_KEY="<AADE Subscription Key>"
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
```

#### C. Backend Secrets (Firebase Secrets)
**DO NOT put these in .env**. Use Firebase CLI:

```bash
cd functions
firebase login
firebase use [PROJECT_ID]

# Shopify Admin Token (Backend)
firebase functions:secrets:set SHOPIFY_ADMIN_ACCESS_TOKEN 
# Paste 'shpat_...'

# Shopify Webhook Secret (For Security)
firebase functions:secrets:set SHOPIFY_WEBHOOK_SECRET 
# Paste Webhook Signing Secret

# Stripe (If used)
# firebase functions:secrets:set STRIPE_SECRET_KEY
```

---

### 5. Deployment

#### A. Architecture Overview
-   **Next.js App**: Hosting on Vercel (Recommended) or Firebase Hosting.
-   **Cloud Functions**: Hosted on Firebase (Google Cloud).

#### B. Deploy Functions
```bash
cd functions
firebase deploy --only functions
```
*Note the URL of the `shopify_order_paid` function and update Shopify Webhooks if needed.*

#### C. Deploy Frontend (Vercel)
1.  Push code to GitHub.
2.  Import project in Vercel.
3.  Add all Environment Variables from `.env.local` to Vercel Project Settings.
4.  Deploy.

---

## 🛠️ Operational Tasks

### AADE / MyData (Greece)
-   **Validation**: The system automatically validates VAT numbers for B2B invoices.
-   **Mock Mode**: If `AADE_USER_ID` is missing, it logs XML to Console instead of sending.
-   **Go Live**: Set `AADE_ENVIRONMENT="production"` in `functions/.env` and redeploy.

### User Sync
-   When a user signs up on the website, `functions/auth/user_triggers.py` runs.
-   It creates/links a Shopify Customer.
-   It saves `shopifyCustomerId`, `phoneNumber`, and `billingAddress` to Firestore.

### AI features
-   Gemini AI is integrated via `google-genai` SDK.
-   Ensure `GOOGLE_AI_API_KEY` is set if enabling chat features.
