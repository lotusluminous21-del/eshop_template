import { create } from 'xmlbuilder2';
import { AADEInvoice } from './types';

/**
 * Generates the XML payload for AADE myDATA InvoicesDoc.
 * Follows strict naming conventions (e.g., camelCase vs PascalCase as required by AADE).
 * Note: AADE usually requires capitalization or specific tag names.
 * This implementation assumes strict mapping from our internal types to AADE XML tags.
 */
export function generateInvoiceXML(invoice: AADEInvoice): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('InvoicesDoc', {
            'xmlns': 'http://www.aade.gr/myDATA/invoice/v1.0',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'xsi:schemaLocation': 'http://www.aade.gr/myDATA/invoice/v1.0/InvoicesDoc-v1.0.6.xsd'
        })
        .ele('invoice');

    // === Issuer ===
    const issuer = root.ele('issuer');
    issuer.ele('vatNumber').txt(invoice.issuer.vatNumber);
    issuer.ele('country').txt(invoice.issuer.country);
    issuer.ele('branch').txt(invoice.issuer.branch.toString());

    // === Counterparty (Optional) ===
    if (invoice.counterparty) {
        const cp = root.ele('counterparty');
        if (invoice.counterparty.vatNumber) cp.ele('vatNumber').txt(invoice.counterparty.vatNumber);
        cp.ele('country').txt(invoice.counterparty.country);
        cp.ele('branch').txt(invoice.counterparty.branch.toString());
        if (invoice.counterparty.name) cp.ele('name').txt(invoice.counterparty.name);

        if (invoice.counterparty.address) {
            const addr = cp.ele('address');
            if (invoice.counterparty.address.street) addr.ele('street').txt(invoice.counterparty.address.street);
            if (invoice.counterparty.address.number) addr.ele('number').txt(invoice.counterparty.address.number);
            if (invoice.counterparty.address.postalCode) addr.ele('postalCode').txt(invoice.counterparty.address.postalCode);
            if (invoice.counterparty.address.city) addr.ele('city').txt(invoice.counterparty.address.city);
        }
    }

    // === Invoice Header ===
    const header = root.ele('invoiceHeader');
    header.ele('series').txt(invoice.invoiceHeader.series);
    header.ele('aa').txt(invoice.invoiceHeader.aa);
    header.ele('issueDate').txt(invoice.invoiceHeader.issueDate);
    header.ele('invoiceType').txt(invoice.invoiceHeader.invoiceType);

    if (invoice.invoiceHeader.currency !== 'EUR') {
        header.ele('currency').txt(invoice.invoiceHeader.currency);
        if (invoice.invoiceHeader.exchangeRate) {
            header.ele('exchangeRate').txt(invoice.invoiceHeader.exchangeRate.toString());
        }
    }

    // === Payment Methods ===
    const payments = root.ele('paymentMethods');
    invoice.paymentMethods.forEach(pm => {
        const pmt = payments.ele('paymentMethodDetails');
        pmt.ele('type').txt(pm.type.toString());
        pmt.ele('amount').txt(pm.amount.toFixed(2));
        if (pm.paymentMethodInfo) {
            pmt.ele('paymentMethodInfo').txt(pm.paymentMethodInfo);
        }
    });

    // === Invoice Details (Lines) ===
    invoice.invoiceDetails.forEach(detail => {
        const line = root.ele('invoiceDetails');
        line.ele('lineNumber').txt(detail.lineNumber.toString());
        line.ele('netValue').txt(detail.netValue.toFixed(2));
        line.ele('vatCategory').txt(detail.vatCategory.toString());
        line.ele('vatAmount').txt(detail.vatAmount.toFixed(2));

        detail.incomeClassification.forEach(ic => {
            const cls = line.ele('incomeClassification');
            cls.ele('classificationType').txt(ic.classificationType);
            cls.ele('classificationCategory').txt(ic.classificationCategory);
            cls.ele('amount').txt(ic.amount.toFixed(2));
        });
    });

    // === Invoice Summary ===
    const summary = root.ele('invoiceSummary');
    summary.ele('totalNetValue').txt(invoice.invoiceSummary.totalNetValue.toFixed(2));
    summary.ele('totalVatAmount').txt(invoice.invoiceSummary.totalVatAmount.toFixed(2));
    summary.ele('totalWithheldAmount').txt(invoice.invoiceSummary.totalWithheldAmount.toFixed(2));
    summary.ele('totalFeesAmount').txt(invoice.invoiceSummary.totalFeesAmount.toFixed(2));
    summary.ele('totalStampDutyAmount').txt(invoice.invoiceSummary.totalStampDutyAmount.toFixed(2));
    summary.ele('totalOtherTaxesAmount').txt(invoice.invoiceSummary.totalOtherTaxesAmount.toFixed(2));
    summary.ele('totalDeductionsAmount').txt(invoice.invoiceSummary.totalDeductionsAmount.toFixed(2));
    summary.ele('totalGrossValue').txt(invoice.invoiceSummary.totalGrossValue.toFixed(2));

    return root.end({ prettyPrint: true });
}
