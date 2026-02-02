import { PaymentProviderId } from './types';

export interface PaymentAuditEntry {
    orderId: string;
    provider: PaymentProviderId;
    eventType: 'authorize' | 'capture' | 'refund' | 'void' | 'webhook_received';
    amount: number;
    currency: string;
    transactionId?: string;
    status: 'success' | 'failure';
    error?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export class PaymentAuditService {
    /**
     * Log a payment event to an audit trail (e.g. Firestore 'payment_audit' collection)
     */
    static async log(entry: PaymentAuditEntry) {
        // In a real app: await db.collection('payment_audit').add(entry);

        const logMessage = `[PAYMENT AUDIT] ${entry.timestamp.toISOString()} | ${entry.orderId} | ${entry.provider} | ${entry.eventType} | ${entry.status.toUpperCase()}`;

        if (entry.status === 'failure') {
            console.error(`${logMessage} - Error: ${entry.error}`);
        } else {
            console.log(logMessage);
        }
    }
}
