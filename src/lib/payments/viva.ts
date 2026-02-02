import { PaymentProvider, PaymentIntent } from './types';

interface VivaTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface VivaOrderResponse {
    orderCode: string;
    errorCode: number;
    errorText: string;
}

export class VivaWalletProvider implements PaymentProvider {
    id = 'viva' as const;
    name = 'Viva Wallet';

    private clientId: string;
    private clientSecret: string;
    private merchantId: string;
    private baseUrl: string;
    private accountsUrl: string;

    constructor(
        clientId: string,
        clientSecret: string,
        merchantId: string,
        env: 'demo' | 'prod' = 'demo'
    ) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.merchantId = merchantId;

        this.baseUrl = env === 'prod'
            ? 'https://api.vivapayments.com'
            : 'https://demo-api.vivapayments.com';

        this.accountsUrl = env === 'prod'
            ? 'https://accounts.vivapayments.com'
            : 'https://demo-accounts.vivapayments.com';
    }

    private async getAccessToken(): Promise<string> {
        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetch(`${this.accountsUrl}/connect/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            throw new Error(`Viva auth failed: ${response.statusText}`);
        }

        const data = await response.json() as VivaTokenResponse;
        return data.access_token;
    }

    async createPaymentIntent(
        amount: number,
        currency: string,
        metadata?: Record<string, any>
    ): Promise<PaymentIntent> {
        const token = await this.getAccessToken();

        // Viva expects amount in cents (integer)
        const amountInCents = Math.round(amount * 100);

        const payload = {
            amount: amountInCents,
            customerTrns: metadata?.description || 'E-shop Order',
            customer: {
                email: metadata?.email,
                fullName: metadata?.fullName,
                phone: metadata?.phone,
                countryCode: 'GR', // Default/fallback
                requestLang: 'en-US',
            },
            paymentTimeout: 3600,
            preauth: false,
            allowRecurring: false,
            maxInstallments: 0,
            merchantTrns: metadata?.orderId, // Our internal Order ID
            sourceCode: 'Default', // Would be configurable in real app
        };

        const response = await fetch(`${this.baseUrl}/checkout/v2/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Viva create order failed: ${await response.text()}`);
        }

        const data = await response.json() as VivaOrderResponse;

        return {
            id: data.orderCode.toString(), // Viva Order Code is the identifier
            amount: amount,
            currency: currency,
            status: 'pending',
            provider: 'viva',
            // For Viva Smart Checkout, we redirect the user to this URL
            paymentUrl: `${this.baseUrl}/web/checkout?ref=${data.orderCode}`,
            createdAt: new Date(),
        };
    }

    async refundPayment(
        paymentIntentId: string, // In Viva context, this might need transactionId, distinct from OrderCode
        amount?: number
    ): Promise<{ success: boolean; refundId: string }> {
        // Note: Viva refund requires a Transaction ID, not just the Order Code.
        // The Order Code creates a transaction only after payment.
        // We assume here that paymentIntentId passed is the Transaction ID for refund purposes,
        // Or we need a lookup. For this template, keeping it simple.

        // Real implementation would look up transaction ID from database using Order Code if needed.

        return { success: false, refundId: 'NOT_IMPLEMENTED_YET' };
    }
}
