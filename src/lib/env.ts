import { z } from 'zod';

const envSchema = z.object({
    SHOPIFY_STORE_DOMAIN: z.string().min(1, 'Shopify Store Domain is required'),
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().min(1, 'Shopify Storefront Access Token is required'),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_SITE_NAME: z.string().optional(),
});

const processEnv = {
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
};

// Validate on import
// If validation fails, this will throw an error and stop the build/runtime explicitly.
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
    console.error(
        '❌ Invalid environment variables:',
        parsed.error.flatten().fieldErrors,
    );
    // Only throw in production or if strict mode is desired. 
    // For dev template, maybe just warn? 
    // User requested "plug and play" -> explicit failure is better than silent failure.
    throw new Error('Invalid environment variables');
}

export const env = parsed.data;
