import { PaymentProvider, PaymentIntent } from './types';

interface EverypayResponse {
    token: string; // payment token
    status: string;
    error?: {
        code: number;
        message: string;
    };
}

export class EverypayProvider implements PaymentProvider {
    id = 'everypay' as const;
    name = 'Everypay';

    private publicKey: string;
    private secretKey: string;
    private baseUrl: string;

    constructor(publicKey: string, secretKey: string, env: 'sandbox' | 'prod' = 'sandbox') {
        this.publicKey = publicKey;
        this.secretKey = secretKey;
        this.baseUrl = env === 'prod'
            ? 'https://api.everypay.gr'
            : 'https://sandbox-api.everypay.gr';
    }

    async createPaymentIntent(
        amount: number,
        currency: string,
        metadata?: Record<string, unknown>
    ): Promise<PaymentIntent> {
        // Everypay typically works by creating a payment button or token usage.
        // For a standardized "PaymentIntent" flow, we might generate a payment link or token.
        // Assuming a simplified flow where we initiate a payment request.

        // Note: Everypay API specifics would go here. 
        // Mocking the intent creation for this template as "Pending Action".

        return {
            id: `evpy_${Date.now()}`,
            amount: amount,
            currency: currency,
            status: 'pending',
            provider: 'everypay',
            // Everypay often uses a client-side script with public key to tokenize card, 
            // then server-side charge. 
            // We pass the public key in metadata for the frontend adapter to use.
            metadata: {
                publicKey: this.publicKey,
                ...metadata
            },
            createdAt: new Date(),
        };
    }

    async refundPayment(
        paymentIntentId: string, // Transaction/Payment Token
        amount?: number
    ): Promise<{ success: boolean; refundId: string }> {
        const payload: { amount?: number } = {
            amount: amount ? Math.round(amount * 100) : undefined // Cent amount
        };

        const response = await fetch(`${this.baseUrl}/payments/refund/${paymentIntentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Handle error safely
            return { success: false, refundId: '' };
        }

        const data = await response.json();
        return {
            success: true,
            refundId: data.token || 'unknown_refund_id'
        };
    }
}
