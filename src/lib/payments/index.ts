import { PaymentProviderFactory } from './factory';
import { StripePaymentProvider } from './stripe';
import { VivaWalletProvider } from './viva';
import { EverypayProvider } from './everypay';

// Initialize providers based on environment variables
export function initPaymentProviders() {
    // Stripe Initialization
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
        PaymentProviderFactory.register(new StripePaymentProvider(stripeKey));
    } else {
        console.warn('STRIPE_SECRET_KEY not found. Stripe payment provider will not be available.');
    }

    // Viva Wallet Initialization
    const vivaClientId = process.env.VIVA_CLIENT_ID;
    const vivaClientSecret = process.env.VIVA_CLIENT_SECRET;
    const vivaMerchantId = process.env.VIVA_MERCHANT_ID;

    if (vivaClientId && vivaClientSecret && vivaMerchantId) {
        PaymentProviderFactory.register(
            new VivaWalletProvider(vivaClientId, vivaClientSecret, vivaMerchantId, 'demo')
        );
    } else {
        console.warn('VIVA credentials not found. Viva Wallet provider will not be available.');
    }

    // Everypay Initialization
    const everypayPublic = process.env.EVERYPAY_PUBLIC_KEY;
    const everypaySecret = process.env.EVERYPAY_SECRET_KEY;
    if (everypayPublic && everypaySecret) {
        PaymentProviderFactory.register(
            new EverypayProvider(everypayPublic, everypaySecret, 'sandbox')
        );
    } else {
        console.warn('EVERYPAY credentials not found.');
    }
}

// Re-export types and factory
export * from './types';
export * from './factory';
export * from './audit'; // Export audit service
