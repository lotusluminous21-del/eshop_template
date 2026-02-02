# Greek E-Shop Template Setup Guide

This guide will walk you through setting up the Greek E-Shop Template. This project is designed to be a "plug-and-play" solution for e-commerce in Greece, featuring integrations with local payment providers (Viva Wallet, Everypay) and AADE for compliance, built on top of Next.js, Shopify Storefront API, and Firebase.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: v18 or later (v20+ recommended).
*   **Python**: v3.10 or later (for Cloud Functions).
*   **Firebase CLI**: Install via `npm install -g firebase-tools`.
*   **Git**: For version control.

## 1. Project Initialization

### Clone and Install Dependencies

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd eshop_template
    ```

2.  Install frontend dependencies:
    ```bash
    npm install
    ```

## 2. Configuration Setup

### Environment Variables

1.  Copy the example environment file:
    ```bash
    cp .env.local.example .env.local
    ```

2.  Open `.env.local` and fill in the required values:

    **Shopify Configuration:**
    *   `SHOPIFY_STORE_DOMAIN`: Your Shopify store domain (e.g., `your-store.myshopify.com`).
    *   `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: Generated from Shopify Admin > Settings > Apps > Develop apps.

    **Firebase Configuration:**
    *   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to Project Settings > General to find your web app config.
    *   Fill in `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, etc.

    **Payment & AI (Optional):**
    *   **AI Features**: `NEXT_PUBLIC_ENABLE_AI=true` (Set to `false` to disable Chatbot/Catalogue).
    *   **Payment Providers**: Only configured providers will be active.
        *   `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -> Enables Stripe
        *   `VIVA_CLIENT_ID`... -> Enables Viva
    *   `GOOGLE_CLOUD_PROJECT`, `GOOGLE_AI_API_KEY`: Required only if `NEXT_PUBLIC_ENABLE_AI=true`.

### Firebase Project Setup

Since this project uses Firebase Functions and Authentication, you need to configure the project locally.

1.  Login to Firebase:
    ```bash
    firebase login
    ```

2.  Initialize Firebase in the project root:
    ```bash
    firebase init
    ```
    *   **Select features**: `Firestore`, `Functions`, `Emulators` (optional).
    *   **Select project**: Choose the project you created earlier.
    *   **Firestore**: Accept defaults (`firestore.rules`, `firestore.indexes.json`).
    *   **Functions**:
        *   Language: **Python**
        *   Source directory: `functions` (The directory already exists, so proceed carefuly to not overwrite `main.py` if prompted, or back it up first. **Note:** The template already provides `functions/`, so usually you just need to link the project).
        *   Install dependencies: **No** (We will do it manually to be safe).

    > **Note:** If `firebase init` asks to overwrite existing files (like `functions/main.py`), say **NO**.

## 3. Backend Setup (Cloud Functions)

The backend logic for Payments (Everypay, Viva) and AADE lives in `functions/`.

1.  Navigate to the functions directory:
    ```bash
    cd functions
    ```

2.  Create and activate a Python virtual environment:
    ```bash
    # Windows
    python -m venv venv
    venv\Scripts\activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Important:** You need to set your secret keys in Firebase Functions.
    ```bash
    firebase functions:secrets:set STRIPE_SECRET_KEY
    firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
    firebase functions:secrets:set VIVA_CLIENT_ID
    firebase functions:secrets:set VIVA_CLIENT_SECRET
    firebase functions:secrets:set EVERYPAY_SECRET_KEY
    ```
    (Paste the respective keys when prompted).

## 4. Running the Project

### Development Server

1.  Start the Next.js development server:
    ```bash
    npm run dev
    ```
    The site will be available at `http://localhost:3000`.

    > **Note:** The root page (`/`) currently displays the default Next.js template. You can find the shop pages at your configured routes (check `src/app` structure). You may want to modify `src/app/page.tsx` to redirect to your shop home or replace it with your landing page.

### Deploying Functions

To deploy your backend functions to Firebase:

```bash
firebase deploy --only functions
```

## 5. "Plug-and-Play" Checklist

To ensure everything is ready:

- [ ] **Shopify**: Products are visible in the frontend.
- [ ] **Auth**: Users can sign up/login (enable Email/Google Auth in Firebase Console).
- [ ] **Payments**:
    -   Verify `functions/main.py` is deployed.
    -   Test the payment flow with test credentials.
- [ ] **AADE**: If using invoicing, ensure your certificates/keys are configured in the Python logic (currently custom implementation in `functions/`).

## Troubleshooting

-   **Firebase Config Missing**: If you see errors about missing config, ensure `.env.local` is correct and loaded.
-   **Function Errors**: Check Firebase Console > Functions > Logs for traceback.
-   **"Plug-and-Play" Status**: This template provides the *core logic* (Payments, AADE, Auth). You will still need to design your frontend UI in `src/app` or use the provided components in `src/components` to build your unique store layout.
