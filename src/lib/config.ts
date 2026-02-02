export const CONFIG = {
    features: {
        ai: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
        payments: {
            stripe: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, // Or similar check
            viva: !!process.env.NEXT_PUBLIC_VIVA_CLIENT_ID, // Example check
        }
    }
};

export const IS_AI_ENABLED = CONFIG.features.ai;
