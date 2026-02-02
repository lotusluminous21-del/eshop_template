import { AADEClient } from '@/lib/aade/client';
import { AADEInvoice, InvoiceTypeEnum, VATCategoryEnum, PaymentMethodEnum } from '@/lib/aade/types';
// In a real app, we would import OrderRepository to fetch the order details
// import { getOrder } from '@/lib/data/orders';

/**
 * Handles post-payment processing:
 * 1. Verifies payment status
 * 2. Generates AADE invoice
 * 3. Transmits to myDATA
 * 4. Updates order with AADE MARK/UID
 */
export async function handlePaymentSuccessWorkflow(
    orderId: string,
    paymentMetadata: Record<string, unknown>
) {
    console.log(`Starting post-payment workflow for Order ${orderId}`);

    // 1. Fetch Order (Mocked for now)
    const order = {
        id: orderId,
        total: 124.00, // 100 net + 24 VAT
        vat: 24.00,
        customer: {
            vatNumber: '123456789', // Example B2B
            country: 'GR',
            branch: 0,
        }
    };

    // 2. Initialize AADE Client
    // Should use env vars
    const aadeClient = new AADEClient(
        process.env.AADE_USER_ID || '',
        process.env.AADE_SUBSCRIPTION_KEY || '',
        'dev'
    );

    // 3. Construct Invoice Object
    // This logic needs to be robust mapping from Order -> AADEInvoice
    const invoice: AADEInvoice = {
        issuer: {
            vatNumber: process.env.AADE_VAT_NUMBER || '999999999',
            country: 'GR',
            branch: 0
        },
        counterparty: {
            vatNumber: order.customer.vatNumber,
            country: order.customer.country,
            branch: order.customer.branch,
            name: 'Test Customer B2B', // fetch from order
            address: {
                street: 'Test Street',
                number: '10',
                postalCode: '11111',
                city: 'Athens'
            }
        },
        invoiceHeader: {
            series: 'A',
            aa: orderId.slice(0, 5), // Simplified AA
            issueDate: new Date().toISOString().split('T')[0],
            invoiceType: InvoiceTypeEnum.SALES_INVOICE, // 1.1 Timologio
            currency: 'EUR'
        },
        paymentMethods: [{
            type: PaymentMethodEnum.CARD, // 3 - Card
            amount: order.total,
            paymentMethodInfo: 'Stripe/Viva'
        }],
        invoiceDetails: [
            {
                lineNumber: 1,
                netValue: 100.00,
                vatCategory: VATCategoryEnum.STANDARD_24,
                vatAmount: 24.00,
                incomeClassification: [{
                    classificationType: 'E3_561_001',
                    classificationCategory: 'category1_1',
                    amount: 100.00
                }]
            }
        ],
        invoiceSummary: {
            totalNetValue: 100.00,
            totalVatAmount: 24.00,
            totalWithheldAmount: 0,
            totalFeesAmount: 0,
            totalStampDutyAmount: 0,
            totalOtherTaxesAmount: 0,
            totalDeductionsAmount: 0,
            totalGrossValue: 124.00
        }
    };

    // 4. Transmit
    const result = await aadeClient.sendInvoice(invoice);

    if (result.success) {
        console.log(`AADE Transmission Success! MARK: ${result.mark}, UID: ${result.uid}`);
        // TODO: Save MARK/UID to Firestore Order
    } else {
        console.error(`AADE Transmission Failed: ${result.errors?.join(', ')}`);
        // TODO: Queue for retry or alert admin
    }
}
