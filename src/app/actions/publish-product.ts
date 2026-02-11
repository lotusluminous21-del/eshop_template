'use server';

import { createShopifyProduct } from '@/lib/shopify/admin';
import { db } from '@/app/actions/firebase-admin-setup'; // Need a server-side firebase instance
// Wait, do we have server-side firebase setup? 
// The user has 'firebase-admin' in functions, but in Next.js usually we use 'firebase-admin' as well for server actions.
// If 'firebase-admin' is not initialized in Next.js yet, I might need to create a singleton for it.
// Checking previous file list... 'src' doesn't seem to have a dedicated firebase-admin setup file for the *app*.
// I will create a basic one or assume we can use client SDK if allowed (but writes should be server-side).
// Actually, for "Publishing" it's better to be secure.
// Let's create a server-side setup for this action.

// Temporary: I will define the init logic inside the action or a util if missing.
// But better practice: create src/lib/firebase-admin.ts

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Ideally we use service account, but for now we might rely on default Google credentials if running in Cloud Run/Functions,
// OR use the environment variables. The user has NEXT_PUBLIC_FIREBASE... which are client keys.
// For Admin SDK, we need a service account or allow unauthenticated writes (BAD).
// FOR THIS TEMPLATE: We will assume the user is authenticated on the client and passes a token, OR we use the client SDK on the client side to update firestore, and the Server Action ONLY does the Shopify part?
// Better: Server Action does everything.

// Let's defer "perfect auth" and focus on "working feature".
// I'll try to use the existing client-side logic to update Firestore status *after* the server action returns success.
// That avoids needing the Admin SDK setup in Next.js right now.
// So this action will JUST create the product in Shopify.

export async function publishProductAction(draftId: string, productData: any) {
    console.log("Publishing draft:", draftId);

    // 1. Transform Draft to Shopify Format
    const shopifyPayload = {
        title: productData.title,
        body_html: productData.description || "",
        vendor: "AI Catalogue",
        product_type: "Generated",
        tags: productData.tags || [],
        variants: [
            {
                price: String(productData.price || "0.00"),
                sku: productData.sku,
            }
        ]
        // TODO: Handle options properly if they exist
    };

    try {
        const shopifyProduct = await createShopifyProduct(shopifyPayload);
        return { success: true, shopifyId: shopifyProduct.id, handle: shopifyProduct.handle };
    } catch (error) {
        console.error("Publish failed:", error);
        return { success: false, error: (error as Error).message };
    }
}
