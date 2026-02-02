import { z } from 'zod';

/**
 * Invoice Types (Τύποι Παραστατικών)
 */
export const InvoiceTypeEnum = {
    SALES_INVOICE: '1.1',
    SALES_INVOICE_INTRA_EU: '1.2',
    SALES_INVOICE_THIRD: '1.3',
    SERVICE_INVOICE: '2.1',
    RETAIL_RECEIPT: '11.1',
    RETAIL_SERVICE: '11.2',
    CREDIT_INVOICE: '5.1',
    CREDIT_RETAIL: '11.4',
} as const;

export const VATCategoryEnum = {
    STANDARD_24: 1,
    REDUCED_13: 2,
    SUPER_REDUCED_6: 3,
    EXEMPT: 7,
    NO_VAT: 8,
} as const;

export const PaymentMethodEnum = {
    CASH: 1,
    CHEQUE: 2,
    CARD: 3,
    CREDIT: 4,
    BANK_TRANSFER: 5,
    DIGITAL_WALLET: 6,
    DIGITAL_CURRENCY: 7,
} as const;

export const AADEInvoiceSchema = z.object({
    // === Issuer (Εκδότης) ===
    issuer: z.object({
        vatNumber: z.string().length(9),
        country: z.literal('GR'),
        branch: z.number().int().default(0),
    }),

    // === Counterparty (Λήπτης) ===
    counterparty: z.object({
        vatNumber: z.string().optional(),
        country: z.string().length(2),
        branch: z.number().int().default(0),
        name: z.string().optional(),
        address: z.object({
            street: z.string().optional(),
            number: z.string().optional(),
            postalCode: z.string().optional(),
            city: z.string().optional(),
        }).optional(),
    }).optional(),

    // === Invoice Header ===
    invoiceHeader: z.object({
        series: z.string().max(50),
        aa: z.string(),
        issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        invoiceType: z.string(),
        currency: z.string().length(3).default('EUR'),
        exchangeRate: z.number().optional(),
    }),

    // === Payment Methods ===
    paymentMethods: z.array(z.object({
        type: z.number().int(),
        amount: z.number(),
        paymentMethodInfo: z.string().optional(),
    })),

    // === Invoice Details ===
    invoiceDetails: z.array(z.object({
        lineNumber: z.number().int(),
        netValue: z.number(),
        vatCategory: z.number().int(),
        vatAmount: z.number(),
        incomeClassification: z.array(z.object({
            classificationType: z.string(),
            classificationCategory: z.string(),
            amount: z.number(),
        })),
    })),

    // === Invoice Summary ===
    invoiceSummary: z.object({
        totalNetValue: z.number(),
        totalVatAmount: z.number(),
        totalWithheldAmount: z.number().default(0),
        totalFeesAmount: z.number().default(0),
        totalStampDutyAmount: z.number().default(0),
        totalOtherTaxesAmount: z.number().default(0),
        totalDeductionsAmount: z.number().default(0),
        totalGrossValue: z.number(),
    }),
});

export type AADEInvoice = z.infer<typeof AADEInvoiceSchema>;
