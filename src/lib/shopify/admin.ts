import { env } from '../env';

const SHOPIFY_ADMIN_API_VERSION = '2024-01'; // or latest
const SHOPIFY_DOMAIN = env.SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.warn("Missing SHOPIFY_ADMIN_ACCESS_TOKEN. Admin features will fail.");
}

interface ShopifyProductInput {
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    tags: string[];
    variants: Array<{
        price: string;
        sku?: string;
        option1?: string;
    }>;
    options?: Array<{
        name: string;
        values: string[];
    }>;
}

export async function createShopifyProduct(productData: ShopifyProductInput) {
    if (!ACCESS_TOKEN) throw new Error("Missing Admin Token");

    const url = `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/products.json`;

    // Prepare payload
    // Shopify Admin API expects { "product": { ... } }
    const payload = {
        product: productData
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ACCESS_TOKEN
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Shopify Create Error:", data);
        throw new Error(data.errors ? JSON.stringify(data.errors) : "Failed to create product");
    }

    return data.product;
}
