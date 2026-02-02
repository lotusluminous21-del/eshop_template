import { generateInvoiceXML } from './xml-generator';
import { AADEInvoice } from './types';
import { create } from 'xmlbuilder2';

interface AADEResponse {
    success: boolean;
    mark?: string; // MARK assigned by AADE
    uid?: string;  // UID assigned by AADE
    errors?: string[];
}

export class AADEClient {
    private userId: string;
    private subscriptionKey: string;
    private baseUrl: string;

    constructor(userId: string, subscriptionKey: string, env: 'dev' | 'prod' = 'dev') {
        this.userId = userId;
        this.subscriptionKey = subscriptionKey;
        this.baseUrl = env === 'prod'
            ? 'https://mydatapi.aade.gr/myDATA/SendInvoices'
            : 'https://mydata-dev.azure-api.net/SendInvoices';
    }

    async sendInvoice(invoice: AADEInvoice): Promise<AADEResponse> {
        const xmlPayload = generateInvoiceXML(invoice);

        // In dev mode, we might not want to actually send if keys are missing
        if (!this.userId || !this.subscriptionKey) {
            console.warn('AADE credentials missing. Skipping transmission in mock mode.');
            return {
                success: true,
                mark: 'MOCK_MARK_' + Date.now(),
                uid: 'MOCK_UID_' + Date.now(),
            };
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/xml',
                    'aade-user-id': this.userId,
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                },
                body: xmlPayload,
            });

            if (!response.ok) {
                throw new Error(`AADE API Error: ${response.status} ${response.statusText}`);
            }

            const responseXml = await response.text();
            return this.parseResponse(responseXml);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during transmission';
            console.error('AADE Transmission Failed:', error);
            return {
                success: false,
                errors: [errorMessage],
            };
        }
    }

    private parseResponse(xml: string): AADEResponse {
        try {
            // Define expected structure
            interface AADEXMLStructure {
                Response?: {
                    statusCode: unknown;
                    invoiceUid?: unknown;
                    invoiceMark?: unknown;
                    errors?: {
                        error?: {
                            message?: unknown;
                        }
                    }
                };
                response?: {
                    statusCode: unknown;
                    invoiceUid?: unknown;
                    invoiceMark?: unknown;
                    errors?: {
                        error?: {
                            message?: unknown;
                        }
                    }
                };
            }

            const doc = create(xml).end({ format: 'object' }) as unknown as AADEXMLStructure;
            // Note: Actual AADE response structure parsing needs to be robust.
            // <response>
            //   <index>1</index>
            //   <invoiceUid>...</invoiceUid>
            //   <invoiceMark>...</invoiceMark>
            //   <statusCode>Success</statusCode>
            // </response>

            // Simplified parsing logic for this template users to expand
            // We assume single invoice transmission for now.

            const responseBody = doc.Response || doc.response; // XML is case sensitive but let's be safe

            if (!responseBody) {
                return { success: false, errors: ['Invalid XML response format'] };
            }

            // Check for success code
            const statusCode = typeof responseBody.statusCode === 'string' ? responseBody.statusCode : '';
            if (statusCode === 'Success') {
                return {
                    success: true,
                    mark: typeof responseBody.invoiceMark === 'string' ? responseBody.invoiceMark : undefined,
                    uid: typeof responseBody.invoiceUid === 'string' ? responseBody.invoiceUid : undefined,
                };
            } else {
                const message = responseBody.errors?.error?.message;
                const errors = typeof message === 'string'
                    ? [message]
                    : ['Unknown AADE error'];
                return { success: false, errors };
            }
        } catch (err) {
            return { success: false, errors: ['Failed to parse AADE response XML'] };
        }
    }
}
