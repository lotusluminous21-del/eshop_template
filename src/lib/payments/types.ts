import { z } from 'zod';

export type PaymentProviderId = 'stripe' | 'viva' | 'everypay' | 'cod';

export const PaymentMethodSchema = z.enum(['card', 'bank_transfer', 'wallet', 'cash_on_delivery']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export interface PaymentIntent {
    id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
    clientSecret?: string; // For client-side SDKs (e.g., Stripe)
    paymentUrl?: string;   // For redirect-based flows (e.g., Viva)
    provider: PaymentProviderId;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface PaymentProvider {
    /**
     * Unique identifier for the provider
     */
    id: PaymentProviderId;

    /**
     * Friendly name for display
     */
    name: string;

    /**
     * Create a payment intent/order to start the flow
     */
    createPaymentIntent(
        amount: number,
        currency: string,
        metadata?: Record<string, any>
    ): Promise<PaymentIntent>;

    /**
     * confirmPayment is usually handled client-side or via webhook, 
     * but some providers might need a server-side confirmation step.
     */
    confirmPayment?(paymentIntentId: string): Promise<PaymentIntent>;

    /**
     * Refund a payment
     */
    refundPayment(
        paymentIntentId: string,
        amount?: number // partial refund if specified
    ): Promise<{ success: boolean; refundId: string }>;
}
