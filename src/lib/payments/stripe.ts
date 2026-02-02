import Stripe from 'stripe';
import { PaymentProvider, PaymentIntent } from './types';

export const STRIPE_API_VERSION = '2026-01-28.clover';

export class StripePaymentProvider implements PaymentProvider {
    id = 'stripe' as const;
    name = 'Stripe';
    private stripe: Stripe;

    constructor(apiKey: string) {
        this.stripe = new Stripe(apiKey, {
            apiVersion: STRIPE_API_VERSION,
            typescript: true,
        });
    }

    async createPaymentIntent(
        amount: number,
        currency: string,
        metadata?: Record<string, any>
    ): Promise<PaymentIntent> {
        // Stripe expects amount in smallest currency unit (e.g. cents)
        // Assuming 'amount' passed in is already in cents or we handling it here.
        // NOTE: In the docs/06 schema, prices are just numbers. 
        // Usually standard is to store decimals for display but convert to integers for payment.
        // For safety, let's assume the input `amount` is in MAJOR units (e.g. 10.50 EUR) 
        // because that's what we usually display.
        // So we multiply by 100 for EUR/USD.

        // However, it's safer if the caller handles this or we define a strict convention. 
        // Let's stick to: Input amount is in MAJOR units (e.g. 10.50). 

        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: metadata,
        });

        return {
            id: paymentIntent.id,
            amount: amount, // Return original major amount
            currency: currency,
            status: this.mapStatus(paymentIntent.status),
            clientSecret: paymentIntent.client_secret || undefined,
            provider: 'stripe',
            createdAt: new Date(paymentIntent.created * 1000),
        };
    }

    async refundPayment(
        paymentIntentId: string,
        amount?: number
    ): Promise<{ success: boolean; refundId: string }> {
        const params: Stripe.RefundCreateParams = {
            payment_intent: paymentIntentId,
        };

        if (amount) {
            params.amount = Math.round(amount * 100);
        }

        const refund = await this.stripe.refunds.create(params);

        return {
            success: refund.status === 'succeeded' || refund.status === 'pending',
            refundId: refund.id,
        };
    }

    private mapStatus(stripeStatus: Stripe.PaymentIntent.Status): PaymentIntent['status'] {
        switch (stripeStatus) {
            case 'succeeded':
                return 'succeeded';
            case 'processing':
                return 'processing';
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
            case 'requires_capture':
                return 'pending';
            case 'canceled':
                return 'canceled';
            default:
                return 'failed';
        }
    }
}
