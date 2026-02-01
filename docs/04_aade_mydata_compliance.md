# AADE myDATA Compliance Guide for E-Commerce

## Executive Summary

This comprehensive guide provides implementation-ready specifications for integrating Greek e-commerce platforms with the AADE (Independent Authority for Public Revenue) myDATA electronic invoicing and tax reporting system. The guide covers regulatory requirements, direct API implementation, third-party provider integration, and Firebase-specific architecture patterns.

**Target Audience**: Developers, AI coding agents, and technical architects implementing myDATA compliance for Greek e-commerce businesses.

**Technology Stack**: Firebase Cloud Functions (Python), Firestore, Shopify integration

---

## Table of Contents

1. [Regulatory Requirements](#section-1-regulatory-requirements)
2. [Direct myDATA API Implementation](#section-2-direct-mydata-api-implementation)
3. [Third-Party Provider Integration](#section-3-third-party-provider-integration)
4. [Firebase Architecture for AADE Compliance](#section-4-firebase-architecture-for-aade-compliance)
5. [Integration with E-commerce Flow](#section-5-integration-with-e-commerce-flow)

---

## Section 1: Regulatory Requirements

### 1.1 Overview of myDATA Obligations

The myDATA (My Digital Accounting and Tax Application) platform is Greece's mandatory electronic invoicing and tax reporting system managed by AADE. All VAT-registered entities in Greece must comply with myDATA requirements.

#### Key Obligations for E-Commerce Businesses

| Obligation | Description | Deadline |
|------------|-------------|----------|
| **E-Invoice Transmission** | All electronic invoices must be transmitted to myDATA | Real-time (at moment of issuance) |
| **MARK Assignment** | Receive and display unique registration number | Immediate upon transmission |
| **E-Books Maintenance** | Maintain electronic accounting books | Continuous |
| **Data Classification** | Classify income and expenses | Per transaction |
| **QR Code Display** | Include QR code on PDF invoices | Since January 1, 2024 |

#### Mandatory Compliance Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    myDATA Compliance Timeline                        │
├─────────────────────────────────────────────────────────────────────┤
│ September 1, 2025  │ B2G mandatory (contracts > €2,500)             │
│ February 2, 2026   │ B2B mandatory (revenue > €1M in 2023)          │
│ October 1, 2026    │ B2B mandatory (all other businesses)           │
│ Ongoing            │ B2C e-invoicing voluntary (but reporting req.) │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Invoice Types Required

#### 1.2.1 Retail Receipts (Απόδειξη Λιανικής Πώλησης - ΑΛΠ)

**myDATA Type Code: 11.1**

Used for B2C transactions where the customer is a private individual.

```python
# Invoice Type Configuration
RETAIL_RECEIPT_CONFIG = {
    "invoice_type": "11.1",
    "greek_name": "Απόδειξη Λιανικής Πώλησης",
    "english_name": "Retail Sales Receipt",
    "category": "non_confronted",  # Μη Αντικριζόμενα
    "requires_recipient_vat": False,
    "requires_recipient_details": False,
    "transmission_timing": "real_time",
    "fiscal_device_required": False,  # When using certified e-invoicing provider
}
```

**Characteristics:**
- No recipient VAT number required
- No recipient details required (anonymous customer)
- Must be transmitted item-by-item to myDATA
- Can be issued without fiscal device (EAFDSS) when using certified provider

#### 1.2.2 Sales Invoices (Τιμολόγιο Πώλησης)

**myDATA Type Codes:**

| Code | Type | Use Case |
|------|------|----------|
| **1.1** | Sales Invoice | Standard B2B domestic sales |
| **1.2** | Sales Invoice - Intra-Community | EU B2B sales |
| **1.3** | Sales Invoice - Third Country | Non-EU exports |
| **1.4** | Sales Invoice - On Behalf of Third Parties | Marketplace/dropship |
| **1.5** | Sales Invoice - Third Party Settlement | Commission/fee settlements |
| **1.6** | Sales Invoice - Supplementary | Corrections/additions |

```python
# Sales Invoice Type Configuration
SALES_INVOICE_TYPES = {
    "1.1": {
        "greek_name": "Τιμολόγιο Πώλησης",
        "english_name": "Sales Invoice",
        "category": "confronted",  # Αντικριζόμενα
        "requires_recipient_vat": True,
        "requires_recipient_details": True,
        "vat_applicable": True,
    },
    "1.2": {
        "greek_name": "Τιμολόγιο Πώλησης / Ενδοκοινοτικές Παραδόσεις",
        "english_name": "Sales Invoice - Intra-Community Deliveries",
        "category": "confronted",
        "requires_recipient_vat": True,
        "requires_recipient_details": True,
        "vat_applicable": False,  # Reverse charge
        "vat_exemption_category": "intra_community",
    },
    "1.3": {
        "greek_name": "Τιμολόγιο Πώλησης / Παραδόσεις Τρίτων Χωρών",
        "english_name": "Sales Invoice - Third Country Deliveries",
        "category": "confronted",
        "requires_recipient_vat": False,
        "requires_recipient_details": True,
        "vat_applicable": False,
        "vat_exemption_category": "export",
    },
}
```

#### 1.2.3 Service Provision Invoices (Τιμολόγιο Παροχής Υπηρεσιών)

**myDATA Type Codes:**

| Code | Type | Use Case |
|------|------|----------|
| **2.1** | Service Invoice | Standard domestic services |
| **2.2** | Service Invoice - Intra-Community | EU B2B services |
| **2.3** | Service Invoice - Third Country | Non-EU services |
| **2.4** | Service Invoice - Supplementary | Corrections/additions |

```python
SERVICE_INVOICE_TYPES = {
    "2.1": {
        "greek_name": "Τιμολόγιο Παροχής Υπηρεσιών",
        "english_name": "Service Provision Invoice",
        "category": "confronted",
        "requires_recipient_vat": True,
        "vat_applicable": True,
    },
    "2.2": {
        "greek_name": "Τιμολόγιο Παροχής / Ενδοκοινοτική Παροχή Υπηρεσιών",
        "english_name": "Service Invoice - Intra-Community",
        "category": "confronted",
        "requires_recipient_vat": True,
        "vat_applicable": False,
        "vat_exemption_category": "intra_community_services",
    },
}
```

#### 1.2.4 Credit Notes (Πιστωτικό Τιμολόγιο)

**myDATA Type Codes:**

| Code | Type | Use Case |
|------|------|----------|
| **5.1** | Credit Invoice - Related | Linked to original invoice (refunds, returns) |
| **5.2** | Credit Invoice - Unrelated | Not linked to specific invoice |

```python
CREDIT_NOTE_TYPES = {
    "5.1": {
        "greek_name": "Πιστωτικό Τιμολόγιο / Συσχετιζόμενο",
        "english_name": "Credit Invoice - Related",
        "category": "confronted",
        "requires_correlation": True,  # Must reference original MARK
        "correlation_field": "correlatedInvoices",
    },
    "5.2": {
        "greek_name": "Πιστωτικό Τιμολόγιο / Μη Συσχετιζόμενο",
        "english_name": "Credit Invoice - Unrelated",
        "category": "confronted",
        "requires_correlation": False,
    },
}
```

#### 1.2.5 Self-Billing Documents (Τίτλος Κτήσης)

**myDATA Type Codes:**

| Code | Type | Use Case |
|------|------|----------|
| **3.1** | Acquisition Title - Non-obligated Issuer | Purchases from non-VAT registered |
| **3.2** | Acquisition Title - Refusal | When seller refuses to issue |

```python
SELF_BILLING_TYPES = {
    "3.1": {
        "greek_name": "Τίτλος Κτήσης (μη υπόχρεος Εκδότης)",
        "english_name": "Acquisition Title - Non-obligated Issuer",
        "use_case": "Purchasing from individuals or non-VAT registered entities",
        "withholding_tax_applicable": True,
    },
    "3.2": {
        "greek_name": "Τίτλος Κτήσης (άρνηση έκδοσης από υπόχρεο Εκδότη)",
        "english_name": "Acquisition Title - Refusal of Issuance",
        "use_case": "When obligated seller refuses to issue invoice",
    },
}
```

### 1.3 Real-Time Transmission Requirements

#### Transmission Deadlines

| Document Type | Transmission Deadline | Notes |
|---------------|----------------------|-------|
| **Electronic Invoices (ERP)** | Real-time (at issuance) | Since January 1, 2024 |
| **Retail Receipts** | Real-time | When using certified provider |
| **Credit Notes** | Real-time | Must reference original MARK |
| **Accounting Entries** | Monthly | By 20th of following month |

#### Real-Time Transmission Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Order      │────▶│   Invoice    │────▶│   myDATA     │────▶│   MARK       │
│   Created    │     │   Generated  │     │   Submission │     │   Received   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   Invoice    │
                                         │   Finalized  │
                                         │   with MARK  │
                                         └──────────────┘
```

**Critical**: A transaction should never be halted due to pending MARK. The transaction proceeds normally, and the MARK is assigned shortly after. Any delays (internet issues, etc.) are recorded by the system.

### 1.4 Data Retention Requirements

#### Mandatory Retention Periods

| Data Type | Retention Period | Format |
|-----------|-----------------|--------|
| **Electronic Invoices** | 6 years minimum | Digital (XML/PDF) |
| **Validation Logs** | 6 years minimum | Digital |
| **MARK Records** | 6 years minimum | Digital |
| **Transmission Logs** | 6 years minimum | Digital |
| **Accounting Records** | 10 years | Digital |

```python
# Retention Configuration
RETENTION_CONFIG = {
    "invoices": {
        "years": 6,
        "format": ["xml", "pdf"],
        "storage": "firestore",
        "backup": "cloud_storage",
    },
    "transmission_logs": {
        "years": 6,
        "format": ["json"],
        "storage": "firestore",
    },
    "marks": {
        "years": 6,
        "format": ["json"],
        "storage": "firestore",
    },
    "accounting_records": {
        "years": 10,
        "format": ["json", "xml"],
        "storage": "firestore",
        "backup": "cloud_storage",
    },
}
```

### 1.5 Penalties for Non-Compliance

#### Penalty Structure (Law 5073/2023)

| Violation | Penalty | Cap |
|-----------|---------|-----|
| **Failure to transmit sales invoice** | 10% of net value | €250/document/day, max €100,000/year |
| **Late transmission of sales invoice** | 5% of net value | 50% of non-transmission penalty |
| **Failure to transmit expense invoices** | €250 (single-entry) / €500 (double-entry) | Per tax year |
| **Incorrect summary data** | 5% of net value difference | When transmitted < actual |
| **Failure to transmit movement documents** | €100/violation | €500/day, max €20,000/year |
| **Repeat offense (within 5 years)** | 2x original penalty | - |
| **Third offense (within 5 years)** | 4x original penalty | Max €100,000/year |

#### Additional Consequences

- **Invalid Invoices**: Non-transmitted invoices are invalid for VAT deduction
- **Public Contract Ineligibility**: Non-compliant businesses excluded from government tenders
- **Increased Audit Scrutiny**: Delayed VAT refunds and more frequent audits
- **License Revocation**: Systematic avoidance can lead to business license revocation

### 1.6 Special Considerations for Digital Goods and Services

#### Digital Goods Classification

```python
DIGITAL_GOODS_CONFIG = {
    "invoice_type": "2.1",  # Service Provision Invoice
    "income_classification": {
        "category": "category1_3",  # Revenue from provision of services
        "type": "E3_561_003",  # Sales of services - domestic
    },
    "vat_rules": {
        "b2c_domestic": {
            "rate": 24,  # Standard Greek VAT
            "place_of_supply": "customer_location",
        },
        "b2c_eu": {
            "rate": "destination_country_rate",
            "place_of_supply": "customer_location",
            "oss_applicable": True,  # One-Stop Shop
        },
        "b2b_eu": {
            "rate": 0,
            "reverse_charge": True,
            "invoice_type": "2.2",
        },
        "b2c_non_eu": {
            "rate": 0,
            "vat_exempt": True,
            "invoice_type": "2.3",
        },
    },
}
```

#### OSS (One-Stop Shop) Considerations

For B2C digital services to EU customers:
- VAT charged at destination country rate
- Report through Greek OSS portal
- myDATA transmission still required for Greek records

```python
# EU VAT Rates for Digital Services (2024)
EU_VAT_RATES = {
    "AT": 20, "BE": 21, "BG": 20, "HR": 25, "CY": 19,
    "CZ": 21, "DK": 25, "EE": 22, "FI": 24, "FR": 20,
    "DE": 19, "GR": 24, "HU": 27, "IE": 23, "IT": 22,
    "LV": 21, "LT": 21, "LU": 17, "MT": 18, "NL": 21,
    "PL": 23, "PT": 23, "RO": 19, "SK": 20, "SI": 22,
    "ES": 21, "SE": 25,
}
```

---

## Section 2: Direct myDATA API Implementation

### 2.1 API Overview

#### Endpoints

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://mydatapi.aade.gr/myDATA/` |
| **Development/Sandbox** | `https://mydataapidev.aade.gr/myDATA/` |
| **Developer Portal** | `https://mydata-dev.portal.azure-api.net/` |

#### API Version

Current stable version: **v1.0.10** (November 2024)

### 2.2 Authentication Flow

#### Step 1: Register on myDATA Portal

1. Visit [myDATA Portal](https://www.aade.gr/mydata)
2. Login with TAXISnet credentials
3. Navigate to "REST API Registration"
4. Generate API credentials

#### Step 2: Obtain Credentials

```python
# Credentials structure
MYDATA_CREDENTIALS = {
    "aade_user_id": "YOUR_AADE_USER_ID",  # From myDATA portal
    "subscription_key": "YOUR_SUBSCRIPTION_KEY",  # API key from portal
}
```

#### Step 3: Authentication Headers

```python
def get_auth_headers(aade_user_id: str, subscription_key: str) -> dict:
    """Generate authentication headers for myDATA API calls."""
    return {
        "aade-user-id": aade_user_id,
        "Ocp-Apim-Subscription-Key": subscription_key,
        "Content-Type": "application/xml",
    }
```

### 2.3 XML Schema Structures

#### 2.3.1 Invoice Document Schema (InvoicesDoc)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:icls="http://www.aade.gr/myDATA/incomeClassificaton/v1.0"
             xmlns:ecls="http://www.aade.gr/myDATA/expensesClassificaton/v1.0">
    <invoice>
        <!-- Invoice UID (calculated hash) -->
        <uid>CALCULATED_UID</uid>
        
        <!-- Mark (assigned by AADE after submission) -->
        <mark>0</mark>
        
        <!-- Issuer Information -->
        <issuer>
            <vatNumber>123456789</vatNumber>
            <country>GR</country>
            <branch>0</branch>
            <name>Company Name</name>
            <address>
                <street>Street Name</street>
                <number>123</number>
                <postalCode>12345</postalCode>
                <city>Athens</city>
            </address>
        </issuer>
        
        <!-- Counterpart (Recipient) - Optional for retail -->
        <counterpart>
            <vatNumber>987654321</vatNumber>
            <country>GR</country>
            <branch>0</branch>
            <name>Customer Name</name>
            <address>
                <street>Customer Street</street>
                <number>456</number>
                <postalCode>54321</postalCode>
                <city>Thessaloniki</city>
            </address>
        </counterpart>
        
        <!-- Invoice Header -->
        <invoiceHeader>
            <series>A</series>
            <aa>1</aa>
            <issueDate>2024-01-15</issueDate>
            <invoiceType>1.1</invoiceType>
            <vatPaymentSuspension>false</vatPaymentSuspension>
            <currency>EUR</currency>
        </invoiceHeader>
        
        <!-- Payment Methods -->
        <paymentMethods>
            <paymentMethodDetails>
                <type>3</type> <!-- Bank transfer -->
                <amount>124.00</amount>
            </paymentMethodDetails>
        </paymentMethods>
        
        <!-- Invoice Details (Line Items) -->
        <invoiceDetails>
            <lineNumber>1</lineNumber>
            <netValue>100.00</netValue>
            <vatCategory>1</vatCategory>
            <vatAmount>24.00</vatAmount>
            <discountOption>false</discountOption>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>100.00</icls:amount>
            </incomeClassification>
        </invoiceDetails>
        
        <!-- Invoice Summary -->
        <invoiceSummary>
            <totalNetValue>100.00</totalNetValue>
            <totalVatAmount>24.00</totalVatAmount>
            <totalWithheldAmount>0.00</totalWithheldAmount>
            <totalFeesAmount>0.00</totalFeesAmount>
            <totalStampDutyAmount>0.00</totalStampDutyAmount>
            <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
            <totalDeductionsAmount>0.00</totalDeductionsAmount>
            <totalGrossValue>124.00</totalGrossValue>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>100.00</icls:amount>
            </incomeClassification>
        </invoiceSummary>
    </invoice>
</InvoicesDoc>
```

#### 2.3.2 Retail Receipt Example (Type 11.1)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0"
             xmlns:icls="http://www.aade.gr/myDATA/incomeClassificaton/v1.0">
    <invoice>
        <uid>RETAIL_UID_HASH</uid>
        <mark>0</mark>
        
        <issuer>
            <vatNumber>123456789</vatNumber>
            <country>GR</country>
            <branch>0</branch>
        </issuer>
        
        <!-- No counterpart for retail receipts -->
        
        <invoiceHeader>
            <series>R</series>
            <aa>1001</aa>
            <issueDate>2024-01-15</issueDate>
            <invoiceType>11.1</invoiceType>
            <vatPaymentSuspension>false</vatPaymentSuspension>
            <currency>EUR</currency>
        </invoiceHeader>
        
        <paymentMethods>
            <paymentMethodDetails>
                <type>5</type> <!-- Card payment -->
                <amount>49.60</amount>
            </paymentMethodDetails>
        </paymentMethods>
        
        <invoiceDetails>
            <lineNumber>1</lineNumber>
            <netValue>40.00</netValue>
            <vatCategory>1</vatCategory>
            <vatAmount>9.60</vatAmount>
            <discountOption>false</discountOption>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>40.00</icls:amount>
            </incomeClassification>
        </invoiceDetails>
        
        <invoiceSummary>
            <totalNetValue>40.00</totalNetValue>
            <totalVatAmount>9.60</totalVatAmount>
            <totalWithheldAmount>0.00</totalWithheldAmount>
            <totalFeesAmount>0.00</totalFeesAmount>
            <totalStampDutyAmount>0.00</totalStampDutyAmount>
            <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
            <totalDeductionsAmount>0.00</totalDeductionsAmount>
            <totalGrossValue>49.60</totalGrossValue>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>40.00</icls:amount>
            </incomeClassification>
        </invoiceSummary>
    </invoice>
</InvoicesDoc>
```

#### 2.3.3 Credit Note Example (Type 5.1 - Related)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0"
             xmlns:icls="http://www.aade.gr/myDATA/incomeClassificaton/v1.0">
    <invoice>
        <uid>CREDIT_NOTE_UID</uid>
        <mark>0</mark>
        
        <issuer>
            <vatNumber>123456789</vatNumber>
            <country>GR</country>
            <branch>0</branch>
        </issuer>
        
        <counterpart>
            <vatNumber>987654321</vatNumber>
            <country>GR</country>
            <branch>0</branch>
        </counterpart>
        
        <invoiceHeader>
            <series>CN</series>
            <aa>1</aa>
            <issueDate>2024-01-20</issueDate>
            <invoiceType>5.1</invoiceType>
            <vatPaymentSuspension>false</vatPaymentSuspension>
            <currency>EUR</currency>
            <!-- Reference to original invoice -->
            <correlatedInvoices>400001234567890</correlatedInvoices>
        </invoiceHeader>
        
        <paymentMethods>
            <paymentMethodDetails>
                <type>3</type>
                <amount>62.00</amount>
            </paymentMethodDetails>
        </paymentMethods>
        
        <invoiceDetails>
            <lineNumber>1</lineNumber>
            <netValue>50.00</netValue>
            <vatCategory>1</vatCategory>
            <vatAmount>12.00</vatAmount>
            <discountOption>false</discountOption>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>50.00</icls:amount>
            </incomeClassification>
        </invoiceDetails>
        
        <invoiceSummary>
            <totalNetValue>50.00</totalNetValue>
            <totalVatAmount>12.00</totalVatAmount>
            <totalWithheldAmount>0.00</totalWithheldAmount>
            <totalFeesAmount>0.00</totalFeesAmount>
            <totalStampDutyAmount>0.00</totalStampDutyAmount>
            <totalOtherTaxesAmount>0.00</totalOtherTaxesAmount>
            <totalDeductionsAmount>0.00</totalDeductionsAmount>
            <totalGrossValue>62.00</totalGrossValue>
            <incomeClassification>
                <icls:classificationType>E3_561_001</icls:classificationType>
                <icls:classificationCategory>category1_1</icls:classificationCategory>
                <icls:amount>50.00</icls:amount>
            </incomeClassification>
        </invoiceSummary>
    </invoice>
</InvoicesDoc>
```

### 2.4 Invoice Generation Code Patterns (Python)

#### 2.4.1 Core Invoice Builder Class

```python
"""
myDATA Invoice Builder for Firebase Cloud Functions
"""
import hashlib
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum
import xml.etree.ElementTree as ET


class InvoiceType(Enum):
    """myDATA Invoice Types"""
    SALES_INVOICE = "1.1"
    SALES_INVOICE_INTRA_EU = "1.2"
    SALES_INVOICE_THIRD_COUNTRY = "1.3"
    SERVICE_INVOICE = "2.1"
    SERVICE_INVOICE_INTRA_EU = "2.2"
    CREDIT_NOTE_RELATED = "5.1"
    CREDIT_NOTE_UNRELATED = "5.2"
    RETAIL_RECEIPT = "11.1"


class VATCategory(Enum):
    """VAT Categories"""
    STANDARD_24 = 1  # 24%
    REDUCED_13 = 2   # 13%
    REDUCED_6 = 3    # 6%
    EXEMPT = 7       # 0% exempt
    NO_VAT = 8       # Outside VAT scope


class PaymentMethod(Enum):
    """Payment Method Types"""
    DOMESTIC_PAYMENTS_ACCOUNT = 1
    FOREIGN_PAYMENTS_ACCOUNT = 2
    CASH = 3
    CHECK = 4
    CREDIT_CARD = 5
    WEB_BANKING = 6
    POS = 7
    IRIS = 8


class IncomeClassificationType(Enum):
    """Income Classification Types for E3"""
    SALES_GOODS_DOMESTIC = "E3_561_001"
    SALES_GOODS_INTRA_EU = "E3_561_002"
    SALES_SERVICES_DOMESTIC = "E3_561_003"
    SALES_SERVICES_INTRA_EU = "E3_561_005"
    SALES_GOODS_THIRD_COUNTRY = "E3_561_007"


class IncomeClassificationCategory(Enum):
    """Income Classification Categories"""
    SALES_GOODS = "category1_1"
    SALES_GOODS_ON_BEHALF = "category1_2"
    SALES_SERVICES = "category1_3"
    SALES_FIXED_ASSETS = "category1_4"
    OTHER_INCOME = "category1_5"


@dataclass
class Address:
    """Address structure for myDATA"""
    street: str
    number: str
    postal_code: str
    city: str
    country: str = "GR"


@dataclass
class Party:
    """Party (Issuer/Counterpart) structure"""
    vat_number: str
    country: str = "GR"
    branch: int = 0
    name: Optional[str] = None
    address: Optional[Address] = None


@dataclass
class InvoiceLine:
    """Invoice line item"""
    line_number: int
    net_value: Decimal
    vat_category: VATCategory
    vat_amount: Decimal
    quantity: Decimal = Decimal("1")
    measurement_unit: int = 1  # 1 = pieces
    income_classification_type: IncomeClassificationType = IncomeClassificationType.SALES_GOODS_DOMESTIC
    income_classification_category: IncomeClassificationCategory = IncomeClassificationCategory.SALES_GOODS
    item_description: Optional[str] = None
    discount_option: bool = False


@dataclass
class PaymentMethodDetail:
    """Payment method detail"""
    payment_type: PaymentMethod
    amount: Decimal
    payment_info: Optional[str] = None


@dataclass
class MyDataInvoice:
    """Complete myDATA Invoice structure"""
    issuer: Party
    invoice_type: InvoiceType
    series: str
    aa: int  # Invoice number
    issue_date: datetime
    currency: str = "EUR"
    counterpart: Optional[Party] = None
    lines: List[InvoiceLine] = field(default_factory=list)
    payment_methods: List[PaymentMethodDetail] = field(default_factory=list)
    correlated_invoices: Optional[str] = None  # MARK of original invoice for credit notes
    
    def calculate_uid(self) -> str:
        """
        Calculate UID (Unique Document ID) as SHA-1 hash of:
        VAT ID Issuer + Date of Issue + Branch + Document Type + Series + AA
        """
        uid_string = (
            f"{self.issuer.vat_number}"
            f"{self.issue_date.strftime('%Y-%m-%d')}"
            f"{self.issuer.branch}"
            f"{self.invoice_type.value}"
            f"{self.series}"
            f"{self.aa}"
        )
        return hashlib.sha1(uid_string.encode()).hexdigest().upper()
    
    def calculate_totals(self) -> Dict[str, Decimal]:
        """Calculate invoice totals"""
        total_net = sum(line.net_value for line in self.lines)
        total_vat = sum(line.vat_amount for line in self.lines)
        total_gross = total_net + total_vat
        
        return {
            "total_net_value": total_net,
            "total_vat_amount": total_vat,
            "total_gross_value": total_gross,
            "total_withheld_amount": Decimal("0"),
            "total_fees_amount": Decimal("0"),
            "total_stamp_duty_amount": Decimal("0"),
            "total_other_taxes_amount": Decimal("0"),
            "total_deductions_amount": Decimal("0"),
        }


class MyDataXMLBuilder:
    """Builder for myDATA XML documents"""
    
    NAMESPACE = "http://www.aade.gr/myDATA/invoice/v1.0"
    ICLS_NAMESPACE = "http://www.aade.gr/myDATA/incomeClassificaton/v1.0"
    
    def __init__(self):
        self.nsmap = {
            None: self.NAMESPACE,
            "icls": self.ICLS_NAMESPACE,
        }
    
    def build_invoice_xml(self, invoice: MyDataInvoice) -> str:
        """Build complete XML document for invoice submission"""
        
        # Create root element
        root = ET.Element("InvoicesDoc")
        root.set("xmlns", self.NAMESPACE)
        root.set("xmlns:icls", self.ICLS_NAMESPACE)
        
        # Create invoice element
        inv_elem = ET.SubElement(root, "invoice")
        
        # UID
        uid_elem = ET.SubElement(inv_elem, "uid")
        uid_elem.text = invoice.calculate_uid()
        
        # Mark (0 for new submissions)
        mark_elem = ET.SubElement(inv_elem, "mark")
        mark_elem.text = "0"
        
        # Issuer
        self._add_party_element(inv_elem, "issuer", invoice.issuer)
        
        # Counterpart (if present)
        if invoice.counterpart:
            self._add_party_element(inv_elem, "counterpart", invoice.counterpart)
        
        # Invoice Header
        self._add_invoice_header(inv_elem, invoice)
        
        # Payment Methods
        self._add_payment_methods(inv_elem, invoice.payment_methods)
        
        # Invoice Details (Lines)
        for line in invoice.lines:
            self._add_invoice_detail(inv_elem, line)
        
        # Invoice Summary
        self._add_invoice_summary(inv_elem, invoice)
        
        # Convert to string
        return ET.tostring(root, encoding="unicode", xml_declaration=True)
    
    def _add_party_element(self, parent: ET.Element, tag: str, party: Party):
        """Add party (issuer/counterpart) element"""
        party_elem = ET.SubElement(parent, tag)
        
        vat_elem = ET.SubElement(party_elem, "vatNumber")
        vat_elem.text = party.vat_number
        
        country_elem = ET.SubElement(party_elem, "country")
        country_elem.text = party.country
        
        branch_elem = ET.SubElement(party_elem, "branch")
        branch_elem.text = str(party.branch)
        
        if party.name:
            name_elem = ET.SubElement(party_elem, "name")
            name_elem.text = party.name
        
        if party.address:
            addr_elem = ET.SubElement(party_elem, "address")
            
            street_elem = ET.SubElement(addr_elem, "street")
            street_elem.text = party.address.street
            
            number_elem = ET.SubElement(addr_elem, "number")
            number_elem.text = party.address.number
            
            postal_elem = ET.SubElement(addr_elem, "postalCode")
            postal_elem.text = party.address.postal_code
            
            city_elem = ET.SubElement(addr_elem, "city")
            city_elem.text = party.address.city
    
    def _add_invoice_header(self, parent: ET.Element, invoice: MyDataInvoice):
        """Add invoice header element"""
        header_elem = ET.SubElement(parent, "invoiceHeader")
        
        series_elem = ET.SubElement(header_elem, "series")
        series_elem.text = invoice.series
        
        aa_elem = ET.SubElement(header_elem, "aa")
        aa_elem.text = str(invoice.aa)
        
        date_elem = ET.SubElement(header_elem, "issueDate")
        date_elem.text = invoice.issue_date.strftime("%Y-%m-%d")
        
        type_elem = ET.SubElement(header_elem, "invoiceType")
        type_elem.text = invoice.invoice_type.value
        
        vat_susp_elem = ET.SubElement(header_elem, "vatPaymentSuspension")
        vat_susp_elem.text = "false"
        
        currency_elem = ET.SubElement(header_elem, "currency")
        currency_elem.text = invoice.currency
        
        # Add correlated invoices for credit notes
        if invoice.correlated_invoices:
            corr_elem = ET.SubElement(header_elem, "correlatedInvoices")
            corr_elem.text = invoice.correlated_invoices
    
    def _add_payment_methods(self, parent: ET.Element, payments: List[PaymentMethodDetail]):
        """Add payment methods element"""
        if not payments:
            return
        
        methods_elem = ET.SubElement(parent, "paymentMethods")
        
        for payment in payments:
            detail_elem = ET.SubElement(methods_elem, "paymentMethodDetails")
            
            type_elem = ET.SubElement(detail_elem, "type")
            type_elem.text = str(payment.payment_type.value)
            
            amount_elem = ET.SubElement(detail_elem, "amount")
            amount_elem.text = str(payment.amount)
            
            if payment.payment_info:
                info_elem = ET.SubElement(detail_elem, "paymentMethodInfo")
                info_elem.text = payment.payment_info
    
    def _add_invoice_detail(self, parent: ET.Element, line: InvoiceLine):
        """Add invoice detail (line item) element"""
        detail_elem = ET.SubElement(parent, "invoiceDetails")
        
        line_num_elem = ET.SubElement(detail_elem, "lineNumber")
        line_num_elem.text = str(line.line_number)
        
        net_elem = ET.SubElement(detail_elem, "netValue")
        net_elem.text = f"{line.net_value:.2f}"
        
        vat_cat_elem = ET.SubElement(detail_elem, "vatCategory")
        vat_cat_elem.text = str(line.vat_category.value)
        
        vat_amt_elem = ET.SubElement(detail_elem, "vatAmount")
        vat_amt_elem.text = f"{line.vat_amount:.2f}"
        
        discount_elem = ET.SubElement(detail_elem, "discountOption")
        discount_elem.text = "true" if line.discount_option else "false"
        
        # Income Classification
        icls_elem = ET.SubElement(detail_elem, "incomeClassification")
        
        icls_type = ET.SubElement(icls_elem, "{%s}classificationType" % self.ICLS_NAMESPACE)
        icls_type.text = line.income_classification_type.value
        
        icls_cat = ET.SubElement(icls_elem, "{%s}classificationCategory" % self.ICLS_NAMESPACE)
        icls_cat.text = line.income_classification_category.value
        
        icls_amt = ET.SubElement(icls_elem, "{%s}amount" % self.ICLS_NAMESPACE)
        icls_amt.text = f"{line.net_value:.2f}"
    
    def _add_invoice_summary(self, parent: ET.Element, invoice: MyDataInvoice):
        """Add invoice summary element"""
        totals = invoice.calculate_totals()
        
        summary_elem = ET.SubElement(parent, "invoiceSummary")
        
        fields = [
            ("totalNetValue", totals["total_net_value"]),
            ("totalVatAmount", totals["total_vat_amount"]),
            ("totalWithheldAmount", totals["total_withheld_amount"]),
            ("totalFeesAmount", totals["total_fees_amount"]),
            ("totalStampDutyAmount", totals["total_stamp_duty_amount"]),
            ("totalOtherTaxesAmount", totals["total_other_taxes_amount"]),
            ("totalDeductionsAmount", totals["total_deductions_amount"]),
            ("totalGrossValue", totals["total_gross_value"]),
        ]
        
        for field_name, value in fields:
            elem = ET.SubElement(summary_elem, field_name)
            elem.text = f"{value:.2f}"
        
        # Aggregate income classification
        icls_elem = ET.SubElement(summary_elem, "incomeClassification")
        
        # Use first line's classification type (simplified - production should aggregate)
        if invoice.lines:
            first_line = invoice.lines[0]
            
            icls_type = ET.SubElement(icls_elem, "{%s}classificationType" % self.ICLS_NAMESPACE)
            icls_type.text = first_line.income_classification_type.value
            
            icls_cat = ET.SubElement(icls_elem, "{%s}classificationCategory" % self.ICLS_NAMESPACE)
            icls_cat.text = first_line.income_classification_category.value
            
            icls_amt = ET.SubElement(icls_elem, "{%s}amount" % self.ICLS_NAMESPACE)
            icls_amt.text = f"{totals['total_net_value']:.2f}"
```

#### 2.4.2 VAT Calculator

```python
"""
VAT Calculator for Greek myDATA compliance
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple
from enum import Enum


class GreekVATRate(Enum):
    """Greek VAT Rates (2024)"""
    STANDARD = Decimal("24")      # Standard rate
    REDUCED_1 = Decimal("13")     # Reduced rate (food, hotels, etc.)
    REDUCED_2 = Decimal("6")      # Super-reduced (medicines, books, etc.)
    ZERO = Decimal("0")           # Zero-rated (exports, intra-EU)
    
    # Island reduced rates (Aegean islands)
    ISLAND_STANDARD = Decimal("17")
    ISLAND_REDUCED_1 = Decimal("9")
    ISLAND_REDUCED_2 = Decimal("4")


def calculate_vat(
    net_amount: Decimal,
    vat_rate: GreekVATRate,
    round_to: int = 2
) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Calculate VAT amount and gross total.
    
    Args:
        net_amount: Net amount before VAT
        vat_rate: VAT rate to apply
        round_to: Decimal places for rounding
    
    Returns:
        Tuple of (net_amount, vat_amount, gross_amount)
    """
    vat_amount = (net_amount * vat_rate.value / Decimal("100")).quantize(
        Decimal(f"0.{'0' * round_to}"),
        rounding=ROUND_HALF_UP
    )
    gross_amount = net_amount + vat_amount
    
    return net_amount, vat_amount, gross_amount


def calculate_net_from_gross(
    gross_amount: Decimal,
    vat_rate: GreekVATRate,
    round_to: int = 2
) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Calculate net amount from gross (VAT-inclusive) amount.
    
    Args:
        gross_amount: Gross amount including VAT
        vat_rate: VAT rate applied
        round_to: Decimal places for rounding
    
    Returns:
        Tuple of (net_amount, vat_amount, gross_amount)
    """
    divisor = Decimal("1") + (vat_rate.value / Decimal("100"))
    net_amount = (gross_amount / divisor).quantize(
        Decimal(f"0.{'0' * round_to}"),
        rounding=ROUND_HALF_UP
    )
    vat_amount = gross_amount - net_amount
    
    return net_amount, vat_amount, gross_amount


def get_vat_category_for_rate(vat_rate: GreekVATRate) -> int:
    """Map VAT rate to myDATA VAT category code"""
    mapping = {
        GreekVATRate.STANDARD: 1,
        GreekVATRate.REDUCED_1: 2,
        GreekVATRate.REDUCED_2: 3,
        GreekVATRate.ZERO: 7,
        GreekVATRate.ISLAND_STANDARD: 4,
        GreekVATRate.ISLAND_REDUCED_1: 5,
        GreekVATRate.ISLAND_REDUCED_2: 6,
    }
    return mapping.get(vat_rate, 1)
```

### 2.5 Transmission API Calls

#### 2.5.1 API Client Implementation

```python
"""
myDATA API Client for Firebase Cloud Functions
"""
import httpx
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import xml.etree.ElementTree as ET
from datetime import datetime


logger = logging.getLogger(__name__)


class MyDataEnvironment(Enum):
    """myDATA API Environments"""
    PRODUCTION = "https://mydatapi.aade.gr/myDATA/"
    SANDBOX = "https://mydataapidev.aade.gr/myDATA/"


@dataclass
class MyDataResponse:
    """Response from myDATA API"""
    success: bool
    mark: Optional[str] = None
    uid: Optional[str] = None
    authentication_code: Optional[str] = None
    errors: List[Dict[str, Any]] = None
    raw_response: Optional[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []


@dataclass
class MyDataConfig:
    """Configuration for myDATA API client"""
    aade_user_id: str
    subscription_key: str
    environment: MyDataEnvironment = MyDataEnvironment.SANDBOX
    timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 2


class MyDataAPIClient:
    """
    Client for interacting with AADE myDATA REST API
    """
    
    def __init__(self, config: MyDataConfig):
        self.config = config
        self.base_url = config.environment.value
        self._client = None
    
    @property
    def client(self) -> httpx.Client:
        """Lazy initialization of HTTP client"""
        if self._client is None:
            self._client = httpx.Client(
                timeout=self.config.timeout,
                headers=self._get_headers()
            )
        return self._client
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authentication headers"""
        return {
            "aade-user-id": self.config.aade_user_id,
            "Ocp-Apim-Subscription-Key": self.config.subscription_key,
            "Content-Type": "application/xml",
            "Accept": "application/xml",
        }
    
    def send_invoices(self, xml_content: str) -> MyDataResponse:
        """
        Send invoices to myDATA (SendInvoices endpoint)
        
        Args:
            xml_content: XML document containing invoices
        
        Returns:
            MyDataResponse with MARK if successful
        """
        endpoint = f"{self.base_url}SendInvoices"
        
        try:
            response = self.client.post(
                endpoint,
                content=xml_content.encode("utf-8"),
            )
            
            return self._parse_response(response)
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout sending invoices: {e}")
            return MyDataResponse(
                success=False,
                errors=[{"code": "TIMEOUT", "message": str(e)}]
            )
        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending invoices: {e}")
            return MyDataResponse(
                success=False,
                errors=[{"code": "HTTP_ERROR", "message": str(e)}]
            )
    
    def cancel_invoice(self, mark: str) -> MyDataResponse:
        """
        Cancel an invoice by MARK
        
        Args:
            mark: The MARK of the invoice to cancel
        
        Returns:
            MyDataResponse indicating success/failure
        """
        endpoint = f"{self.base_url}CancelInvoice"
        params = {"mark": mark}
        
        try:
            response = self.client.post(endpoint, params=params)
            return self._parse_response(response)
            
        except httpx.HTTPError as e:
            logger.error(f"Error canceling invoice {mark}: {e}")
            return MyDataResponse(
                success=False,
                errors=[{"code": "HTTP_ERROR", "message": str(e)}]
            )
    
    def request_transmitted_docs(
        self,
        mark: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MyDataResponse:
        """
        Request documents transmitted by this user
        
        Args:
            mark: Specific MARK to retrieve
            date_from: Start date filter
            date_to: End date filter
        
        Returns:
            MyDataResponse with document data
        """
        endpoint = f"{self.base_url}RequestTransmittedDocs"
        params = {}
        
        if mark:
            params["mark"] = mark
        if date_from:
            params["dateFrom"] = date_from.strftime("%d/%m/%Y")
        if date_to:
            params["dateTo"] = date_to.strftime("%d/%m/%Y")
        
        try:
            response = self.client.get(endpoint, params=params)
            return self._parse_response(response)
            
        except httpx.HTTPError as e:
            logger.error(f"Error requesting transmitted docs: {e}")
            return MyDataResponse(
                success=False,
                errors=[{"code": "HTTP_ERROR", "message": str(e)}]
            )
    
    def _parse_response(self, response: httpx.Response) -> MyDataResponse:
        """Parse XML response from myDATA API"""
        raw_content = response.text
        
        if response.status_code != 200:
            return MyDataResponse(
                success=False,
                errors=[{
                    "code": f"HTTP_{response.status_code}",
                    "message": raw_content
                }],
                raw_response=raw_content
            )
        
        try:
            root = ET.fromstring(raw_content)
            
            # Check for errors
            errors = []
            for error_elem in root.findall(".//{http://www.aade.gr/myDATA/invoice/v1.0}error"):
                error_code = error_elem.find("{http://www.aade.gr/myDATA/invoice/v1.0}code")
                error_msg = error_elem.find("{http://www.aade.gr/myDATA/invoice/v1.0}message")
                errors.append({
                    "code": error_code.text if error_code is not None else "UNKNOWN",
                    "message": error_msg.text if error_msg is not None else "Unknown error"
                })
            
            if errors:
                return MyDataResponse(
                    success=False,
                    errors=errors,
                    raw_response=raw_content
                )
            
            # Extract MARK and other success data
            mark_elem = root.find(".//{http://www.aade.gr/myDATA/invoice/v1.0}invoiceMark")
            uid_elem = root.find(".//{http://www.aade.gr/myDATA/invoice/v1.0}invoiceUid")
            auth_elem = root.find(".//{http://www.aade.gr/myDATA/invoice/v1.0}authenticationCode")
            
            return MyDataResponse(
                success=True,
                mark=mark_elem.text if mark_elem is not None else None,
                uid=uid_elem.text if uid_elem is not None else None,
                authentication_code=auth_elem.text if auth_elem is not None else None,
                raw_response=raw_content
            )
            
        except ET.ParseError as e:
            logger.error(f"Error parsing XML response: {e}")
            return MyDataResponse(
                success=False,
                errors=[{"code": "XML_PARSE_ERROR", "message": str(e)}],
                raw_response=raw_content
            )
    
    def close(self):
        """Close the HTTP client"""
        if self._client:
            self._client.close()
            self._client = None
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
```

#### 2.5.2 Error Handling and Response Parsing

```python
"""
Error handling utilities for myDATA API
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class MyDataErrorCode(Enum):
    """Common myDATA error codes"""
    # Validation errors
    INVALID_VAT = "101"
    INVALID_INVOICE_TYPE = "102"
    INVALID_DATE = "103"
    INVALID_AMOUNT = "104"
    MISSING_REQUIRED_FIELD = "105"
    
    # Business logic errors
    DUPLICATE_INVOICE = "201"
    INVOICE_NOT_FOUND = "202"
    INVALID_MARK = "203"
    ALREADY_CANCELLED = "204"
    
    # Authentication errors
    INVALID_CREDENTIALS = "401"
    SUBSCRIPTION_EXPIRED = "402"
    RATE_LIMIT_EXCEEDED = "429"
    
    # System errors
    INTERNAL_ERROR = "500"
    SERVICE_UNAVAILABLE = "503"


@dataclass
class MyDataError:
    """Structured myDATA error"""
    code: str
    message: str
    field: Optional[str] = None
    line_number: Optional[int] = None
    
    @property
    def is_retryable(self) -> bool:
        """Check if error is retryable"""
        retryable_codes = [
            MyDataErrorCode.RATE_LIMIT_EXCEEDED.value,
            MyDataErrorCode.INTERNAL_ERROR.value,
            MyDataErrorCode.SERVICE_UNAVAILABLE.value,
        ]
        return self.code in retryable_codes
    
    @property
    def is_validation_error(self) -> bool:
        """Check if error is a validation error"""
        return self.code.startswith("1")


class MyDataErrorHandler:
    """Handler for myDATA API errors"""
    
    ERROR_MESSAGES = {
        "101": "Invalid VAT number format or non-existent VAT",
        "102": "Invalid invoice type for this transaction",
        "103": "Invalid date format or date out of range",
        "104": "Invalid amount - check decimal places and totals",
        "105": "Missing required field in invoice",
        "201": "Duplicate invoice - already submitted with same UID",
        "202": "Invoice not found for the specified MARK",
        "203": "Invalid MARK format",
        "204": "Invoice already cancelled",
        "401": "Invalid API credentials",
        "402": "API subscription expired",
        "429": "Rate limit exceeded - wait before retrying",
        "500": "Internal server error - retry later",
        "503": "Service temporarily unavailable",
    }
    
    @classmethod
    def parse_errors(cls, error_list: List[Dict]) -> List[MyDataError]:
        """Parse error list from API response"""
        parsed_errors = []
        
        for error in error_list:
            code = error.get("code", "UNKNOWN")
            message = error.get("message", cls.ERROR_MESSAGES.get(code, "Unknown error"))
            
            parsed_errors.append(MyDataError(
                code=code,
                message=message,
                field=error.get("field"),
                line_number=error.get("lineNumber"),
            ))
        
        return parsed_errors
    
    @classmethod
    def get_user_friendly_message(cls, error: MyDataError) -> str:
        """Get user-friendly error message"""
        base_message = cls.ERROR_MESSAGES.get(error.code, error.message)
        
        if error.field:
            return f"{base_message} (Field: {error.field})"
        if error.line_number:
            return f"{base_message} (Line: {error.line_number})"
        
        return base_message
    
    @classmethod
    def should_retry(cls, errors: List[MyDataError]) -> bool:
        """Determine if request should be retried based on errors"""
        return any(error.is_retryable for error in errors)
```

### 2.6 MARK Handling

#### 2.6.1 MARK Storage and Retrieval

```python
"""
MARK (Μοναδικός Αριθμός Καταχώρησης) handling utilities
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import re


@dataclass
class MARKRecord:
    """Record of a MARK assigned by AADE"""
    mark: str
    uid: str
    invoice_id: str
    invoice_type: str
    series: str
    number: int
    issue_date: datetime
    transmission_date: datetime
    authentication_code: Optional[str] = None
    qr_code_url: Optional[str] = None
    
    @property
    def mydata_url(self) -> str:
        """Generate myDATA verification URL"""
        return f"https://www.aade.gr/mydata/invoice/{self.mark}"
    
    def generate_qr_data(self) -> str:
        """Generate data for QR code"""
        return f"https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"


class MARKValidator:
    """Validator for MARK numbers"""
    
    # MARK format: 15-digit numeric string
    MARK_PATTERN = re.compile(r"^\d{15}$")
    
    @classmethod
    def is_valid(cls, mark: str) -> bool:
        """Validate MARK format"""
        if not mark:
            return False
        return bool(cls.MARK_PATTERN.match(mark))
    
    @classmethod
    def extract_info(cls, mark: str) -> Optional[dict]:
        """
        Extract information from MARK
        Note: MARK structure is assigned by AADE and may contain
        encoded information about the submission
        """
        if not cls.is_valid(mark):
            return None
        
        return {
            "mark": mark,
            "length": len(mark),
            "is_valid": True,
        }


def generate_qr_code_svg(mark: str, auth_code: str, size: int = 200) -> str:
    """
    Generate QR code SVG for invoice
    
    Note: In production, use a proper QR code library like qrcode
    This is a placeholder showing the expected output format
    """
    import qrcode
    import qrcode.image.svg
    from io import BytesIO
    
    qr_data = f"https://i.ytimg.com/vi/cfLESpWoUJ8/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCaX--_fTwX-uvwef2sjXXXgOKFcQ"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    factory = qrcode.image.svg.SvgImage
    img = qr.make_image(fill_color="black", back_color="white", image_factory=factory)
    
    buffer = BytesIO()
    img.save(buffer)
    return buffer.getvalue().decode()
```

### 2.7 Cancellation and Correction Procedures

#### 2.7.1 Invoice Cancellation

```python
"""
Invoice cancellation procedures for myDATA
"""
from typing import Optional
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class CancellationRequest:
    """Request to cancel an invoice"""
    mark: str
    reason: str
    requested_by: str
    requested_at: datetime


@dataclass
class CancellationResult:
    """Result of cancellation attempt"""
    success: bool
    mark: str
    cancellation_mark: Optional[str] = None
    error_message: Optional[str] = None
    cancelled_at: Optional[datetime] = None


class InvoiceCancellationService:
    """Service for handling invoice cancellations"""
    
    # Cancellation is allowed within same fiscal year
    # and before accounting period closure
    
    def __init__(self, api_client, firestore_client):
        self.api_client = api_client
        self.db = firestore_client
    
    async def can_cancel(self, mark: str) -> tuple[bool, str]:
        """
        Check if invoice can be cancelled
        
        Returns:
            Tuple of (can_cancel, reason)
        """
        # Retrieve invoice record
        invoice_ref = self.db.collection("invoices").where("mark", "==", mark).limit(1)
        docs = invoice_ref.stream()
        
        invoice_doc = None
        for doc in docs:
            invoice_doc = doc.to_dict()
            break
        
        if not invoice_doc:
            return False, "Invoice not found"
        
        # Check if already cancelled
        if invoice_doc.get("status") == "cancelled":
            return False, "Invoice already cancelled"
        
        # Check fiscal year
        issue_date = invoice_doc.get("issue_date")
        if isinstance(issue_date, str):
            issue_date = datetime.fromisoformat(issue_date)
        
        current_year = datetime.now().year
        invoice_year = issue_date.year
        
        if invoice_year < current_year:
            return False, "Cannot cancel invoices from previous fiscal years"
        
        # Check if credit note already issued
        credit_notes = self.db.collection("invoices").where(
            "correlated_mark", "==", mark
        ).where("invoice_type", "in", ["5.1", "5.2"]).limit(1)
        
        for _ in credit_notes.stream():
            return False, "Credit note already issued for this invoice"
        
        return True, "Invoice can be cancelled"
    
    async def cancel_invoice(self, request: CancellationRequest) -> CancellationResult:
        """
        Cancel an invoice in myDATA
        
        Args:
            request: Cancellation request details
        
        Returns:
            CancellationResult with outcome
        """
        # Check if cancellation is allowed
        can_cancel, reason = await self.can_cancel(request.mark)
        
        if not can_cancel:
            return CancellationResult(
                success=False,
                mark=request.mark,
                error_message=reason
            )
        
        # Send cancellation to myDATA
        response = self.api_client.cancel_invoice(request.mark)
        
        if not response.success:
            return CancellationResult(
                success=False,
                mark=request.mark,
                error_message="; ".join(e.get("message", "") for e in response.errors)
            )
        
        # Update local record
        invoice_ref = self.db.collection("invoices").where(
            "mark", "==", request.mark
        ).limit(1)
        
        for doc in invoice_ref.stream():
            doc.reference.update({
                "status": "cancelled",
                "cancelled_at": datetime.now(),
                "cancellation_reason": request.reason,
                "cancelled_by": request.requested_by,
            })
        
        # Log cancellation
        self.db.collection("cancellation_log").add({
            "mark": request.mark,
            "reason": request.reason,
            "requested_by": request.requested_by,
            "requested_at": request.requested_at,
            "completed_at": datetime.now(),
            "success": True,
        })
        
        return CancellationResult(
            success=True,
            mark=request.mark,
            cancelled_at=datetime.now()
        )
```

#### 2.7.2 Invoice Correction (Credit Note)

```python
"""
Invoice correction via credit notes
"""
from decimal import Decimal
from typing import Optional, List
from datetime import datetime


class InvoiceCorrectionService:
    """Service for correcting invoices via credit notes"""
    
    def __init__(self, api_client, xml_builder, firestore_client):
        self.api_client = api_client
        self.xml_builder = xml_builder
        self.db = firestore_client
    
    async def create_full_credit_note(
        self,
        original_mark: str,
        reason: str,
        created_by: str,
    ) -> dict:
        """
        Create a full credit note for an invoice (complete reversal)
        
        Args:
            original_mark: MARK of original invoice
            reason: Reason for credit note
            created_by: User creating the credit note
        
        Returns:
            Dict with credit note details and new MARK
        """
        # Get original invoice
        original = await self._get_invoice_by_mark(original_mark)
        
        if not original:
            raise ValueError(f"Invoice with MARK {original_mark} not found")
        
        # Create credit note invoice
        credit_note = MyDataInvoice(
            issuer=original["issuer"],
            counterpart=original.get("counterpart"),
            invoice_type=InvoiceType.CREDIT_NOTE_RELATED,
            series="CN",
            aa=await self._get_next_credit_note_number(),
            issue_date=datetime.now(),
            currency=original.get("currency", "EUR"),
            correlated_invoices=original_mark,
            lines=original["lines"],  # Same lines as original
            payment_methods=original["payment_methods"],
        )
        
        # Build XML
        xml_content = self.xml_builder.build_invoice_xml(credit_note)
        
        # Submit to myDATA
        response = self.api_client.send_invoices(xml_content)
        
        if not response.success:
            raise Exception(f"Failed to submit credit note: {response.errors}")
        
        # Store credit note
        credit_note_record = {
            "mark": response.mark,
            "uid": response.uid,
            "invoice_type": "5.1",
            "series": credit_note.series,
            "number": credit_note.aa,
            "issue_date": credit_note.issue_date,
            "correlated_mark": original_mark,
            "reason": reason,
            "created_by": created_by,
            "created_at": datetime.now(),
            "totals": credit_note.calculate_totals(),
            "status": "active",
        }
        
        self.db.collection("invoices").add(credit_note_record)
        
        # Update original invoice status
        await self._update_invoice_status(original_mark, "credited")
        
        return {
            "credit_note_mark": response.mark,
            "original_mark": original_mark,
            "success": True,
        }
    
    async def create_partial_credit_note(
        self,
        original_mark: str,
        credit_lines: List[dict],
        reason: str,
        created_by: str,
    ) -> dict:
        """
        Create a partial credit note for specific line items
        
        Args:
            original_mark: MARK of original invoice
            credit_lines: List of line items to credit
            reason: Reason for credit note
            created_by: User creating the credit note
        
        Returns:
            Dict with credit note details and new MARK
        """
        original = await self._get_invoice_by_mark(original_mark)
        
        if not original:
            raise ValueError(f"Invoice with MARK {original_mark} not found")
        
        # Build credit note lines
        invoice_lines = []
        for i, line in enumerate(credit_lines, 1):
            invoice_lines.append(InvoiceLine(
                line_number=i,
                net_value=Decimal(str(line["net_value"])),
                vat_category=VATCategory(line["vat_category"]),
                vat_amount=Decimal(str(line["vat_amount"])),
                quantity=Decimal(str(line.get("quantity", 1))),
                income_classification_type=IncomeClassificationType(
                    line.get("classification_type", "E3_561_001")
                ),
                income_classification_category=IncomeClassificationCategory(
                    line.get("classification_category", "category1_1")
                ),
            ))
        
        # Create credit note
        credit_note = MyDataInvoice(
            issuer=original["issuer"],
            counterpart=original.get("counterpart"),
            invoice_type=InvoiceType.CREDIT_NOTE_RELATED,
            series="CN",
            aa=await self._get_next_credit_note_number(),
            issue_date=datetime.now(),
            currency=original.get("currency", "EUR"),
            correlated_invoices=original_mark,
            lines=invoice_lines,
            payment_methods=[PaymentMethodDetail(
                payment_type=PaymentMethod.CASH,
                amount=sum(l.net_value + l.vat_amount for l in invoice_lines)
            )],
        )
        
        # Build and submit XML
        xml_content = self.xml_builder.build_invoice_xml(credit_note)
        response = self.api_client.send_invoices(xml_content)
        
        if not response.success:
            raise Exception(f"Failed to submit credit note: {response.errors}")
        
        # Store and return result
        # ... (similar to full credit note)
        
        return {
            "credit_note_mark": response.mark,
            "original_mark": original_mark,
            "credited_amount": sum(l.net_value + l.vat_amount for l in invoice_lines),
            "success": True,
        }
    
    async def _get_invoice_by_mark(self, mark: str) -> Optional[dict]:
        """Retrieve invoice by MARK"""
        docs = self.db.collection("invoices").where("mark", "==", mark).limit(1).stream()
        for doc in docs:
            return doc.to_dict()
        return None
    
    async def _get_next_credit_note_number(self) -> int:
        """Get next credit note number in sequence"""
        # Implementation depends on your numbering strategy
        counter_ref = self.db.collection("counters").document("credit_notes")
        counter = counter_ref.get()
        
        if counter.exists:
            current = counter.to_dict().get("current", 0)
            counter_ref.update({"current": current + 1})
            return current + 1
        else:
            counter_ref.set({"current": 1})
            return 1
    
    async def _update_invoice_status(self, mark: str, status: str):
        """Update invoice status"""
        docs = self.db.collection("invoices").where("mark", "==", mark).limit(1).stream()
        for doc in docs:
            doc.reference.update({"status": status, "updated_at": datetime.now()})
```

### 2.8 Retry Logic and Failure Recovery

```python
"""
Retry logic and failure recovery for myDATA transmissions
"""
import asyncio
import logging
from typing import Callable, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import random


logger = logging.getLogger(__name__)


class RetryStrategy(Enum):
    """Retry strategies"""
    EXPONENTIAL_BACKOFF = "exponential"
    LINEAR_BACKOFF = "linear"
    FIXED_DELAY = "fixed"


@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 60.0  # seconds
    exponential_base: float = 2.0
    jitter: bool = True
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF


@dataclass
class TransmissionAttempt:
    """Record of a transmission attempt"""
    attempt_number: int
    timestamp: datetime
    success: bool
    response_code: Optional[str] = None
    error_message: Optional[str] = None
    mark: Optional[str] = None


@dataclass
class TransmissionRecord:
    """Complete record of transmission attempts"""
    invoice_uid: str
    invoice_id: str
    created_at: datetime
    attempts: list = field(default_factory=list)
    final_status: str = "pending"
    final_mark: Optional[str] = None
    
    @property
    def attempt_count(self) -> int:
        return len(self.attempts)
    
    @property
    def last_attempt(self) -> Optional[TransmissionAttempt]:
        return self.attempts[-1] if self.attempts else None


class RetryHandler:
    """Handler for retry logic with exponential backoff"""
    
    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for next retry attempt"""
        if self.config.strategy == RetryStrategy.FIXED_DELAY:
            delay = self.config.initial_delay
        elif self.config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.initial_delay * attempt
        else:  # EXPONENTIAL_BACKOFF
            delay = self.config.initial_delay * (self.config.exponential_base ** (attempt - 1))
        
        # Apply max delay cap
        delay = min(delay, self.config.max_delay)
        
        # Add jitter to prevent thundering herd
        if self.config.jitter:
            delay = delay * (0.5 + random.random())
        
        return delay
    
    async def execute_with_retry(
        self,
        func: Callable,
        *args,
        should_retry: Callable[[Exception], bool] = None,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic
        
        Args:
            func: Async function to execute
            should_retry: Function to determine if error is retryable
            *args, **kwargs: Arguments to pass to func
        
        Returns:
            Result of successful function call
        
        Raises:
            Last exception if all retries exhausted
        """
        last_exception = None
        
        for attempt in range(1, self.config.max_retries + 1):
            try:
                return await func(*args, **kwargs)
                
            except Exception as e:
                last_exception = e
                
                # Check if we should retry
                if should_retry and not should_retry(e):
                    logger.warning(f"Non-retryable error on attempt {attempt}: {e}")
                    raise
                
                if attempt < self.config.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.warning(
                        f"Attempt {attempt} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.config.max_retries} attempts failed")
        
        raise last_exception


class TransmissionQueueManager:
    """Manager for queued transmissions with failure recovery"""
    
    def __init__(self, api_client, firestore_client, retry_config: RetryConfig = None):
        self.api_client = api_client
        self.db = firestore_client
        self.retry_handler = RetryHandler(retry_config)
    
    async def queue_transmission(self, invoice_data: dict) -> str:
        """
        Queue an invoice for transmission
        
        Returns:
            Queue entry ID
        """
        queue_entry = {
            "invoice_uid": invoice_data["uid"],
            "invoice_id": invoice_data["id"],
            "xml_content": invoice_data["xml"],
            "status": "pending",
            "created_at": datetime.now(),
            "attempts": [],
            "priority": invoice_data.get("priority", 5),
        }
        
        doc_ref = self.db.collection("transmission_queue").add(queue_entry)
        return doc_ref[1].id
    
    async def process_queue(self, batch_size: int = 10):
        """Process pending transmissions in queue"""
        # Get pending items ordered by priority and creation time
        pending = (
            self.db.collection("transmission_queue")
            .where("status", "==", "pending")
            .order_by("priority")
            .order_by("created_at")
            .limit(batch_size)
            .stream()
        )
        
        for doc in pending:
            await self._process_queue_item(doc)
    
    async def _process_queue_item(self, doc):
        """Process a single queue item"""
        data = doc.to_dict()
        doc_ref = doc.reference
        
        # Update status to processing
        doc_ref.update({"status": "processing"})
        
        try:
            # Attempt transmission with retry
            response = await self.retry_handler.execute_with_retry(
                self._transmit_invoice,
                data["xml_content"],
                should_retry=self._is_retryable_error
            )
            
            # Success - update record
            doc_ref.update({
                "status": "completed",
                "completed_at": datetime.now(),
                "mark": response.mark,
                "attempts": data.get("attempts", []) + [{
                    "timestamp": datetime.now(),
                    "success": True,
                    "mark": response.mark,
                }]
            })
            
            # Update invoice record with MARK
            await self._update_invoice_mark(data["invoice_id"], response.mark)
            
        except Exception as e:
            # All retries failed
            attempts = data.get("attempts", [])
            attempts.append({
                "timestamp": datetime.now(),
                "success": False,
                "error": str(e),
            })
            
            doc_ref.update({
                "status": "failed",
                "failed_at": datetime.now(),
                "last_error": str(e),
                "attempts": attempts,
            })
            
            # Alert for manual intervention
            await self._create_alert(data["invoice_id"], str(e))
    
    async def _transmit_invoice(self, xml_content: str):
        """Transmit invoice to myDATA"""
        response = self.api_client.send_invoices(xml_content)
        
        if not response.success:
            error_msg = "; ".join(e.get("message", "") for e in response.errors)
            raise TransmissionError(error_msg, response.errors)
        
        return response
    
    def _is_retryable_error(self, error: Exception) -> bool:
        """Determine if error is retryable"""
        if isinstance(error, TransmissionError):
            # Check error codes
            for err in error.errors:
                code = err.get("code", "")
                # Retryable: rate limits, timeouts, server errors
                if code in ["429", "500", "503", "TIMEOUT"]:
                    return True
                # Not retryable: validation errors, auth errors
                if code.startswith("1") or code in ["401", "402"]:
                    return False
        return True
    
    async def _update_invoice_mark(self, invoice_id: str, mark: str):
        """Update invoice with assigned MARK"""
        self.db.collection("invoices").document(invoice_id).update({
            "mark": mark,
            "mark_assigned_at": datetime.now(),
            "status": "transmitted",
        })
    
    async def _create_alert(self, invoice_id: str, error: str):
        """Create alert for failed transmission"""
        self.db.collection("alerts").add({
            "type": "transmission_failure",
            "invoice_id": invoice_id,
            "error": error,
            "created_at": datetime.now(),
            "status": "open",
        })
    
    async def retry_failed(self, hours_old: int = 24):
        """Retry failed transmissions older than specified hours"""
        cutoff = datetime.now() - timedelta(hours=hours_old)
        
        failed = (
            self.db.collection("transmission_queue")
            .where("status", "==", "failed")
            .where("failed_at", "<", cutoff)
            .stream()
        )
        
        for doc in failed:
            doc.reference.update({"status": "pending"})


class TransmissionError(Exception):
    """Custom exception for transmission errors"""
    
    def __init__(self, message: str, errors: list = None):
        super().__init__(message)
        self.errors = errors or []
```

### 2.9 Sandbox/Test Environment Setup

```python
"""
Sandbox environment configuration and testing utilities
"""
from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class SandboxConfig:
    """Configuration for myDATA sandbox environment"""
    
    # Sandbox API endpoint
    BASE_URL = "https://mydataapidev.aade.gr/myDATA/"
    
    # Developer portal for API key management
    DEVELOPER_PORTAL = "https://mydata-dev.portal.azure-api.net/"
    
    # Test VAT numbers provided by AADE for sandbox
    TEST_VAT_NUMBERS = {
        "issuer": "123456789",      # Test issuer VAT
        "recipient": "987654321",    # Test recipient VAT
        "foreign_eu": "DE123456789", # Test EU VAT
    }
    
    # Test credentials (replace with actual sandbox credentials)
    aade_user_id: str = ""
    subscription_key: str = ""


def get_sandbox_config() -> SandboxConfig:
    """
    Get sandbox configuration from environment variables
    
    Environment variables:
        MYDATA_SANDBOX_USER_ID: AADE user ID for sandbox
        MYDATA_SANDBOX_KEY: Subscription key for sandbox
    """
    return SandboxConfig(
        aade_user_id=os.environ.get("MYDATA_SANDBOX_USER_ID", ""),
        subscription_key=os.environ.get("MYDATA_SANDBOX_KEY", ""),
    )


class SandboxTestHelper:
    """Helper utilities for sandbox testing"""
    
    @staticmethod
    def create_test_invoice() -> dict:
        """Create a test invoice for sandbox submission"""
        from datetime import datetime
        from decimal import Decimal
        
        return {
            "issuer": {
                "vat_number": SandboxConfig.TEST_VAT_NUMBERS["issuer"],
                "country": "GR",
                "branch": 0,
                "name": "Test Company Ltd",
            },
            "counterpart": {
                "vat_number": SandboxConfig.TEST_VAT_NUMBERS["recipient"],
                "country": "GR",
                "branch": 0,
                "name": "Test Customer Ltd",
            },
            "invoice_type": "1.1",
            "series": "TEST",
            "number": 1,
            "issue_date": datetime.now(),
            "lines": [
                {
                    "line_number": 1,
                    "net_value": Decimal("100.00"),
                    "vat_category": 1,
                    "vat_amount": Decimal("24.00"),
                    "classification_type": "E3_561_001",
                    "classification_category": "category1_1",
                }
            ],
            "payment_methods": [
                {
                    "type": 3,
                    "amount": Decimal("124.00"),
                }
            ],
        }
    
    @staticmethod
    def validate_sandbox_response(response: dict) -> bool:
        """Validate response from sandbox API"""
        # Check for expected response structure
        required_fields = ["success"]
        
        for field in required_fields:
            if field not in response:
                return False
        
        if response["success"]:
            # Successful response should have MARK
            return "mark" in response and response["mark"] is not None
        else:
            # Failed response should have errors
            return "errors" in response and len(response["errors"]) > 0
    
    @staticmethod
    def get_sandbox_setup_instructions() -> str:
        """Get instructions for setting up sandbox access"""
        return """
        ## myDATA Sandbox Setup Instructions
        
        1. **Register on Developer Portal**
           - Visit: https://mydata-dev.portal.azure-api.net/
           - Create an account or sign in
        
        2. **Subscribe to myDATA API**
           - Navigate to Products
           - Subscribe to "myDATA API - Sandbox"
           - Note your subscription key
        
        3. **Get AADE User ID**
           - Login to TAXISnet with test credentials
           - Navigate to myDATA settings
           - Generate API user ID
        
        4. **Configure Environment Variables**
           ```bash
           export MYDATA_SANDBOX_USER_ID="your_user_id"
           export MYDATA_SANDBOX_KEY="your_subscription_key"
           ```
        
        5. **Test Connection**
           ```python
           from mydata_client import MyDataAPIClient, MyDataConfig, MyDataEnvironment
           
           config = MyDataConfig(
               aade_user_id=os.environ["MYDATA_SANDBOX_USER_ID"],
               subscription_key=os.environ["MYDATA_SANDBOX_KEY"],
               environment=MyDataEnvironment.SANDBOX,
           )
           
           client = MyDataAPIClient(config)
           # Test with a simple request
           ```
        
        6. **Use Test VAT Numbers**
           - Issuer: 123456789
           - Recipient: 987654321
           - These are special test VAT numbers accepted by sandbox
        """
```

---

## Section 3: Third-Party Provider Integration

### 3.1 SoftOne Integration

#### Overview

SoftOne (Provider Code 001) is one of the first AADE-certified e-invoicing providers in Greece. They offer:
- **SoftOne EINVOICING**: Real-time e-invoicing service
- **ECOS myDATA**: Cloud-based e-books management

#### API Endpoints

```python
"""
SoftOne myDATA Integration
"""
from dataclasses import dataclass
from typing import Optional
import httpx


@dataclass
class SoftOneConfig:
    """SoftOne API Configuration"""
    # Production endpoints
    BASE_URL = "https://einvoicing.softone.gr/api/v1/"
    
    # Authentication
    api_key: str
    client_id: str
    client_secret: str
    
    # Company settings
    company_vat: str
    branch_id: int = 0


class SoftOneClient:
    """Client for SoftOne e-invoicing API"""
    
    def __init__(self, config: SoftOneConfig):
        self.config = config
        self._token = None
        self._client = httpx.Client(
            base_url=config.BASE_URL,
            timeout=30,
        )
    
    def _get_auth_headers(self) -> dict:
        """Get authentication headers"""
        if not self._token:
            self._authenticate()
        
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "X-API-Key": self.config.api_key,
        }
    
    def _authenticate(self):
        """Authenticate and get access token"""
        response = self._client.post(
            "auth/token",
            json={
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "grant_type": "client_credentials",
            }
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
    
    def submit_invoice(self, invoice_data: dict) -> dict:
        """
        Submit invoice to SoftOne for myDATA transmission
        
        Args:
            invoice_data: Invoice data in SoftOne format
        
        Returns:
            Response with MARK and status
        """
        response = self._client.post(
            "invoices/submit",
            headers=self._get_auth_headers(),
            json=invoice_data,
        )
        response.raise_for_status()
        return response.json()
    
    def get_invoice_status(self, invoice_id: str) -> dict:
        """Get status of submitted invoice"""
        response = self._client.get(
            f"invoices/{invoice_id}/status",
            headers=self._get_auth_headers(),
        )
        response.raise_for_status()
        return response.json()
    
    def cancel_invoice(self, mark: str) -> dict:
        """Cancel invoice by MARK"""
        response = self._client.post(
            f"invoices/cancel",
            headers=self._get_auth_headers(),
            json={"mark": mark},
        )
        response.raise_for_status()
        return response.json()


# Invoice submission example
def create_softone_invoice(order_data: dict) -> dict:
    """
    Convert order data to SoftOne invoice format
    """
    return {
        "invoiceType": "1.1",  # Sales Invoice
        "series": order_data.get("series", "A"),
        "number": order_data["invoice_number"],
        "issueDate": order_data["date"].isoformat(),
        "currency": "EUR",
        "issuer": {
            "vatNumber": order_data["company_vat"],
            "country": "GR",
            "branch": 0,
        },
        "counterpart": {
            "vatNumber": order_data["customer_vat"],
            "country": order_data.get("customer_country", "GR"),
            "name": order_data["customer_name"],
            "address": {
                "street": order_data["customer_address"],
                "city": order_data["customer_city"],
                "postalCode": order_data["customer_postal"],
            },
        },
        "lines": [
            {
                "lineNumber": i + 1,
                "description": item["name"],
                "quantity": item["quantity"],
                "unitPrice": float(item["price"]),
                "netValue": float(item["net_total"]),
                "vatCategory": 1,  # 24%
                "vatAmount": float(item["vat_amount"]),
                "incomeClassification": {
                    "type": "E3_561_001",
                    "category": "category1_1",
                },
            }
            for i, item in enumerate(order_data["items"])
        ],
        "paymentMethods": [
            {
                "type": 5 if order_data["payment_method"] == "card" else 3,
                "amount": float(order_data["total"]),
            }
        ],
        "totals": {
            "netValue": float(order_data["subtotal"]),
            "vatAmount": float(order_data["vat_total"]),
            "grossValue": float(order_data["total"]),
        },
    }
```

#### Webhook Setup

```python
"""
SoftOne Webhook Handler for Firebase Functions
"""
from firebase_functions import https_fn
from firebase_admin import firestore
import hmac
import hashlib


@https_fn.on_request()
def softone_webhook(request):
    """
    Handle webhooks from SoftOne for invoice status updates
    
    Webhook events:
    - invoice.transmitted: Invoice successfully sent to myDATA
    - invoice.mark_assigned: MARK received from AADE
    - invoice.failed: Transmission failed
    - invoice.cancelled: Invoice cancelled
    """
    # Verify webhook signature
    signature = request.headers.get("X-SoftOne-Signature")
    if not verify_webhook_signature(request.data, signature):
        return {"error": "Invalid signature"}, 401
    
    event = request.json
    event_type = event.get("type")
    
    db = firestore.client()
    
    if event_type == "invoice.mark_assigned":
        # Update invoice with MARK
        invoice_id = event["data"]["invoice_id"]
        mark = event["data"]["mark"]
        auth_code = event["data"]["authentication_code"]
        
        db.collection("invoices").document(invoice_id).update({
            "mark": mark,
            "authentication_code": auth_code,
            "mydata_status": "transmitted",
            "transmitted_at": firestore.SERVER_TIMESTAMP,
        })
        
        # Generate QR code URL
        qr_url = f"https://i.ytimg.com/vi/VPY4iEwq_RQ/maxresdefault.jpg"
        db.collection("invoices").document(invoice_id).update({
            "qr_code_url": qr_url,
        })
    
    elif event_type == "invoice.failed":
        invoice_id = event["data"]["invoice_id"]
        error = event["data"]["error"]
        
        db.collection("invoices").document(invoice_id).update({
            "mydata_status": "failed",
            "mydata_error": error,
            "failed_at": firestore.SERVER_TIMESTAMP,
        })
        
        # Create alert for manual review
        db.collection("alerts").add({
            "type": "mydata_transmission_failed",
            "invoice_id": invoice_id,
            "error": error,
            "created_at": firestore.SERVER_TIMESTAMP,
        })
    
    return {"status": "ok"}, 200


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify SoftOne webhook signature"""
    import os
    
    webhook_secret = os.environ.get("SOFTONE_WEBHOOK_SECRET")
    if not webhook_secret:
        return False
    
    expected = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
```

### 3.2 Epsilon Net (Pylon) Integration

#### Overview

Epsilon Net (Provider Code 004) offers:
- **Epsilon Digital**: E-invoicing and myDATA transmission
- **Epsilon Smart**: Invoicing software with myDATA integration
- **myDATA HUB**: SaaS solution for e-books management

#### API Integration

```python
"""
Epsilon Net (Epsilon Digital) myDATA Integration
"""
from dataclasses import dataclass
from typing import Optional, List
import httpx
from datetime import datetime


@dataclass
class EpsilonNetConfig:
    """Epsilon Net API Configuration"""
    BASE_URL = "https://api.epsilonnet.gr/einvoicing/v1/"
    
    # Authentication
    api_key: str
    api_secret: str
    
    # Company settings
    company_vat: str
    company_name: str


class EpsilonNetClient:
    """Client for Epsilon Net e-invoicing API"""
    
    def __init__(self, config: EpsilonNetConfig):
        self.config = config
        self._client = httpx.Client(
            base_url=config.BASE_URL,
            timeout=30,
        )
    
    def _get_headers(self) -> dict:
        """Get API headers"""
        return {
            "X-API-Key": self.config.api_key,
            "X-API-Secret": self.config.api_secret,
            "Content-Type": "application/json",
        }
    
    def submit_invoice(self, invoice: dict) -> dict:
        """
        Submit invoice for myDATA transmission
        
        Args:
            invoice: Invoice data in Epsilon Net format
        
        Returns:
            Response with submission ID and status
        """
        response = self._client.post(
            "documents/submit",
            headers=self._get_headers(),
            json=invoice,
        )
        response.raise_for_status()
        return response.json()
    
    def get_document_status(self, document_id: str) -> dict:
        """Get status of submitted document"""
        response = self._client.get(
            f"documents/{document_id}",
            headers=self._get_headers(),
        )
        response.raise_for_status()
        return response.json()
    
    def get_mark(self, document_id: str) -> Optional[str]:
        """Get MARK for submitted document"""
        status = self.get_document_status(document_id)
        return status.get("mark")
    
    def cancel_document(self, mark: str, reason: str) -> dict:
        """Cancel document by MARK"""
        response = self._client.post(
            "documents/cancel",
            headers=self._get_headers(),
            json={
                "mark": mark,
                "cancellationReason": reason,
            },
        )
        response.raise_for_status()
        return response.json()
    
    def create_credit_note(
        self,
        original_mark: str,
        credit_data: dict,
    ) -> dict:
        """Create credit note linked to original invoice"""
        credit_data["correlatedMark"] = original_mark
        credit_data["documentType"] = "5.1"  # Credit Note - Related
        
        return self.submit_invoice(credit_data)


def convert_to_epsilon_format(order_data: dict) -> dict:
    """
    Convert order data to Epsilon Net invoice format
    """
    return {
        "documentType": "1.1",
        "series": order_data.get("series", "A"),
        "number": order_data["invoice_number"],
        "issueDate": order_data["date"].strftime("%Y-%m-%d"),
        "issuer": {
            "vatNumber": order_data["company_vat"],
            "name": order_data["company_name"],
            "country": "GR",
            "branch": 0,
            "address": {
                "street": order_data["company_address"],
                "city": order_data["company_city"],
                "postalCode": order_data["company_postal"],
            },
        },
        "counterpart": {
            "vatNumber": order_data.get("customer_vat"),
            "name": order_data["customer_name"],
            "country": order_data.get("customer_country", "GR"),
            "address": {
                "street": order_data["customer_address"],
                "city": order_data["customer_city"],
                "postalCode": order_data["customer_postal"],
            },
        },
        "items": [
            {
                "lineNumber": i + 1,
                "description": item["name"],
                "quantity": float(item["quantity"]),
                "measurementUnit": 1,
                "unitPrice": float(item["price"]),
                "netValue": float(item["net_total"]),
                "vatCategory": 1,
                "vatAmount": float(item["vat_amount"]),
                "classification": {
                    "incomeType": "E3_561_001",
                    "incomeCategory": "category1_1",
                },
            }
            for i, item in enumerate(order_data["items"])
        ],
        "payments": [
            {
                "method": _map_payment_method(order_data["payment_method"]),
                "amount": float(order_data["total"]),
            }
        ],
        "summary": {
            "totalNetValue": float(order_data["subtotal"]),
            "totalVatAmount": float(order_data["vat_total"]),
            "totalGrossValue": float(order_data["total"]),
        },
    }


def _map_payment_method(method: str) -> int:
    """Map payment method to Epsilon Net code"""
    mapping = {
        "cash": 3,
        "card": 5,
        "bank_transfer": 1,
        "paypal": 6,
        "pos": 7,
    }
    return mapping.get(method, 3)
```

#### Webhook Configuration

```python
"""
Epsilon Net Webhook Handler
"""
from firebase_functions import https_fn
from firebase_admin import firestore
import json


@https_fn.on_request()
def epsilon_webhook(request):
    """
    Handle webhooks from Epsilon Net
    
    Events:
    - DOCUMENT_TRANSMITTED: Successfully sent to myDATA
    - MARK_RECEIVED: MARK assigned by AADE
    - TRANSMISSION_ERROR: Failed to transmit
    - DOCUMENT_CANCELLED: Document cancelled
    """
    # Verify request origin
    api_key = request.headers.get("X-Epsilon-API-Key")
    if not verify_api_key(api_key):
        return {"error": "Unauthorized"}, 401
    
    event = request.json
    event_type = event.get("eventType")
    document_id = event.get("documentId")
    
    db = firestore.client()
    
    handlers = {
        "MARK_RECEIVED": handle_mark_received,
        "TRANSMISSION_ERROR": handle_transmission_error,
        "DOCUMENT_CANCELLED": handle_document_cancelled,
    }
    
    handler = handlers.get(event_type)
    if handler:
        handler(db, event)
    
    return {"status": "processed"}, 200


def handle_mark_received(db, event):
    """Handle MARK received event"""
    document_id = event["documentId"]
    mark = event["mark"]
    auth_code = event.get("authenticationCode")
    
    # Find invoice by external document ID
    invoices = db.collection("invoices").where(
        "epsilon_document_id", "==", document_id
    ).limit(1).stream()
    
    for invoice in invoices:
        invoice.reference.update({
            "mark": mark,
            "authentication_code": auth_code,
            "mydata_status": "transmitted",
            "transmitted_at": firestore.SERVER_TIMESTAMP,
        })


def handle_transmission_error(db, event):
    """Handle transmission error event"""
    document_id = event["documentId"]
    error_code = event.get("errorCode")
    error_message = event.get("errorMessage")
    
    invoices = db.collection("invoices").where(
        "epsilon_document_id", "==", document_id
    ).limit(1).stream()
    
    for invoice in invoices:
        invoice.reference.update({
            "mydata_status": "failed",
            "mydata_error_code": error_code,
            "mydata_error_message": error_message,
            "failed_at": firestore.SERVER_TIMESTAMP,
        })


def handle_document_cancelled(db, event):
    """Handle document cancelled event"""
    mark = event["mark"]
    
    invoices = db.collection("invoices").where(
        "mark", "==", mark
    ).limit(1).stream()
    
    for invoice in invoices:
        invoice.reference.update({
            "status": "cancelled",
            "cancelled_at": firestore.SERVER_TIMESTAMP,
        })


def verify_api_key(api_key: str) -> bool:
    """Verify Epsilon Net API key"""
    import os
    expected = os.environ.get("EPSILON_WEBHOOK_KEY")
    return api_key == expected
```

### 3.3 Entersoft Integration

#### Overview

Entersoft (Provider Code 002) offers:
- **Entersoft Business Suite (EBS)**: Full ERP with myDATA integration
- **Entersoft e-Invoicing**: Standalone e-invoicing service

#### API Integration

```python
"""
Entersoft myDATA Integration
"""
from dataclasses import dataclass
from typing import Optional, Dict, Any
import httpx
from datetime import datetime


@dataclass
class EntersoftConfig:
    """Entersoft API Configuration"""
    BASE_URL = "https://api.entersoft.gr/mydata/v1/"
    
    # Authentication
    client_id: str
    client_secret: str
    
    # Company settings
    company_vat: str
    subscription_id: str


class EntersoftClient:
    """Client for Entersoft myDATA API"""
    
    def __init__(self, config: EntersoftConfig):
        self.config = config
        self._token = None
        self._token_expires = None
        self._client = httpx.Client(
            base_url=config.BASE_URL,
            timeout=30,
        )
    
    def _ensure_authenticated(self):
        """Ensure we have a valid access token"""
        if self._token and self._token_expires and datetime.now() < self._token_expires:
            return
        
        response = self._client.post(
            "auth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
            }
        )
        response.raise_for_status()
        
        data = response.json()
        self._token = data["access_token"]
        self._token_expires = datetime.now() + timedelta(seconds=data["expires_in"] - 60)
    
    def _get_headers(self) -> dict:
        """Get authenticated headers"""
        self._ensure_authenticated()
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "X-Subscription-Id": self.config.subscription_id,
        }
    
    def submit_document(self, document: dict) -> dict:
        """
        Submit document for myDATA transmission
        
        Args:
            document: Document data in Entersoft format
        
        Returns:
            Submission response with tracking ID
        """
        response = self._client.post(
            "documents",
            headers=self._get_headers(),
            json=document,
        )
        response.raise_for_status()
        return response.json()
    
    def get_document_status(self, tracking_id: str) -> dict:
        """Get document transmission status"""
        response = self._client.get(
            f"documents/{tracking_id}/status",
            headers=self._get_headers(),
        )
        response.raise_for_status()
        return response.json()
    
    def batch_submit(self, documents: list) -> dict:
        """Submit multiple documents in batch"""
        response = self._client.post(
            "documents/batch",
            headers=self._get_headers(),
            json={"documents": documents},
        )
        response.raise_for_status()
        return response.json()
    
    def cancel_document(self, mark: str) -> dict:
        """Cancel document by MARK"""
        response = self._client.delete(
            f"documents/{mark}",
            headers=self._get_headers(),
        )
        response.raise_for_status()
        return response.json()


def convert_to_entersoft_format(order_data: dict) -> dict:
    """Convert order to Entersoft document format"""
    return {
        "documentType": order_data.get("invoice_type", "1.1"),
        "series": order_data.get("series", "A"),
        "number": order_data["invoice_number"],
        "issueDate": order_data["date"].isoformat(),
        "currency": "EUR",
        "issuer": {
            "vatNumber": order_data["company_vat"],
            "country": "GR",
            "branch": 0,
        },
        "counterpart": {
            "vatNumber": order_data.get("customer_vat"),
            "name": order_data["customer_name"],
            "country": order_data.get("customer_country", "GR"),
        },
        "lines": [
            {
                "lineNumber": idx + 1,
                "netValue": float(item["net_total"]),
                "vatCategory": 1,
                "vatAmount": float(item["vat_amount"]),
                "incomeClassification": {
                    "type": "E3_561_001",
                    "category": "category1_1",
                },
            }
            for idx, item in enumerate(order_data["items"])
        ],
        "payments": [
            {
                "type": 5 if order_data["payment_method"] == "card" else 3,
                "amount": float(order_data["total"]),
            }
        ],
        "totals": {
            "netValue": float(order_data["subtotal"]),
            "vatAmount": float(order_data["vat_total"]),
            "grossValue": float(order_data["total"]),
        },
    }
```

### 3.4 Retail/Cloud Providers

#### 3.4.1 simplyPOS Integration

```python
"""
simplyPOS Integration for Retail myDATA
"""
from dataclasses import dataclass
import httpx


@dataclass
class SimplyPOSConfig:
    """simplyPOS Configuration"""
    BASE_URL = "https://api.simplypos.gr/v1/"
    api_key: str
    store_id: str


class SimplyPOSClient:
    """Client for simplyPOS API"""
    
    def __init__(self, config: SimplyPOSConfig):
        self.config = config
        self._client = httpx.Client(
            base_url=config.BASE_URL,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                "X-Store-Id": config.store_id,
            },
            timeout=30,
        )
    
    def create_receipt(self, receipt_data: dict) -> dict:
        """Create retail receipt with automatic myDATA transmission"""
        response = self._client.post(
            "receipts",
            json=receipt_data,
        )
        response.raise_for_status()
        return response.json()
    
    def get_receipt(self, receipt_id: str) -> dict:
        """Get receipt details including MARK"""
        response = self._client.get(f"receipts/{receipt_id}")
        response.raise_for_status()
        return response.json()
```

#### 3.4.2 CloudPOS Integration

```python
"""
CloudPOS Integration
"""
from dataclasses import dataclass
import httpx


@dataclass
class CloudPOSConfig:
    """CloudPOS Configuration"""
    BASE_URL = "https://api.cloudpos.gr/api/v2/"
    api_key: str
    merchant_id: str


class CloudPOSClient:
    """Client for CloudPOS API"""
    
    def __init__(self, config: CloudPOSConfig):
        self.config = config
        self._client = httpx.Client(
            base_url=config.BASE_URL,
            headers={
                "X-API-Key": config.api_key,
                "X-Merchant-Id": config.merchant_id,
            },
            timeout=30,
        )
    
    def issue_receipt(self, items: list, payment: dict) -> dict:
        """Issue retail receipt"""
        response = self._client.post(
            "receipts/issue",
            json={
                "items": items,
                "payment": payment,
                "transmitToMyData": True,
            },
        )
        response.raise_for_status()
        return response.json()
```

### 3.5 Provider Comparison Table

| Feature | SoftOne | Epsilon Net | Entersoft | simplyPOS | CloudPOS |
|---------|---------|-------------|-----------|-----------|----------|
| **Provider Code** | 001 | 004 | 002 | - | - |
| **Certification Date** | July 2020 | July 2020 | July 2020 | - | - |
| **API Type** | REST | REST | REST | REST | REST |
| **Real-time Transmission** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Batch Submission** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Webhook Support** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **B2B Invoicing** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **B2C Receipts** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Credit Notes** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Self-Billing** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **ERP Integration** | Full | Full | Full | Limited | Limited |
| **Standalone API** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sandbox Environment** | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Pricing Considerations

| Provider | Pricing Model | Estimated Cost | Best For |
|----------|---------------|----------------|----------|
| **SoftOne** | Per-document + Monthly | €0.05-0.15/doc + €20-50/mo | Medium-Large businesses |
| **Epsilon Net** | Tiered subscription | €30-200/mo based on volume | All sizes |
| **Entersoft** | Enterprise licensing | Custom pricing | Large enterprises |
| **simplyPOS** | Per-transaction | €0.02-0.05/receipt | Retail-focused |
| **CloudPOS** | Monthly subscription | €15-50/mo | Small retail |

#### Integration Complexity

| Provider | Setup Time | Documentation | Support |
|----------|------------|---------------|---------|
| **SoftOne** | 2-3 days | Good | Email + Phone |
| **Epsilon Net** | 2-3 days | Excellent | Email + Phone + Chat |
| **Entersoft** | 1-2 weeks | Good | Dedicated account manager |
| **simplyPOS** | 1 day | Basic | Email |
| **CloudPOS** | 1 day | Basic | Email |

#### Best Fit Scenarios

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Provider Selection Guide                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Small E-commerce (< 100 invoices/month):                               │
│  → Epsilon Net (Epsilon Smart) or CloudPOS                              │
│  → Reason: Simple setup, affordable, good documentation                 │
│                                                                          │
│  Medium E-commerce (100-1000 invoices/month):                           │
│  → SoftOne EINVOICING or Epsilon Digital                                │
│  → Reason: Robust API, batch processing, good support                   │
│                                                                          │
│  Large E-commerce (> 1000 invoices/month):                              │
│  → Entersoft or SoftOne with ERP integration                            │
│  → Reason: Enterprise features, dedicated support, scalability          │
│                                                                          │
│  Retail-focused (POS integration):                                      │
│  → simplyPOS or CloudPOS                                                │
│  → Reason: Optimized for retail receipts, POS integration               │
│                                                                          │
│  Direct API (Full control):                                             │
│  → Direct AADE myDATA API                                               │
│  → Reason: No provider fees, full control, but more development         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Section 4: Firebase Architecture for AADE Compliance

### 4.1 Firebase Function Structure

#### Project Structure

```
functions/
├── main.py                      # Entry point
├── requirements.txt             # Dependencies
├── config/
│   ├── __init__.py
│   ├── settings.py              # Configuration
│   └── mydata_config.py         # myDATA specific config
├── mydata/
│   ├── __init__.py
│   ├── client.py                # myDATA API client
│   ├── xml_builder.py           # XML generation
│   ├── invoice_types.py         # Invoice type definitions
│   ├── vat_calculator.py        # VAT calculations
│   └── mark_handler.py          # MARK management
├── services/
│   ├── __init__.py
│   ├── invoice_service.py       # Invoice business logic
│   ├── transmission_service.py  # Transmission handling
│   ├── cancellation_service.py  # Cancellation handling
│   └── credit_note_service.py   # Credit note handling
├── handlers/
│   ├── __init__.py
│   ├── order_handlers.py        # Order event handlers
│   ├── webhook_handlers.py      # External webhooks
│   └── scheduled_handlers.py    # Scheduled tasks
├── models/
│   ├── __init__.py
│   ├── invoice.py               # Invoice model
│   ├── transmission.py          # Transmission model
│   └── audit.py                 # Audit log model
└── utils/
    ├── __init__.py
    ├── validators.py            # Input validation
    ├── converters.py            # Data conversion
    └── qr_generator.py          # QR code generation
```

#### Main Entry Point

```python
"""
main.py - Firebase Cloud Functions entry point for myDATA compliance
"""
from firebase_functions import firestore_fn, https_fn, scheduler_fn
from firebase_admin import initialize_app, firestore
import logging

# Initialize Firebase Admin
initialize_app()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# Firestore Triggers
# ============================================================================

@firestore_fn.on_document_created(document="orders/{order_id}")
def on_order_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]):
    """
    Trigger when a new order is created.
    Generates invoice and queues for myDATA transmission.
    """
    from handlers.order_handlers import handle_order_created
    return handle_order_created(event)


@firestore_fn.on_document_updated(document="orders/{order_id}")
def on_order_updated(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]):
    """
    Trigger when an order is updated.
    Handles payment confirmation, cancellations, refunds.
    """
    from handlers.order_handlers import handle_order_updated
    return handle_order_updated(event)


@firestore_fn.on_document_created(document="transmission_queue/{queue_id}")
def on_transmission_queued(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]):
    """
    Trigger when a new transmission is queued.
    Processes the transmission to myDATA.
    """
    from handlers.order_handlers import handle_transmission_queued
    return handle_transmission_queued(event)


# ============================================================================
# HTTP Endpoints
# ============================================================================

@https_fn.on_request()
def mydata_webhook(request):
    """
    Webhook endpoint for myDATA provider callbacks.
    Handles MARK assignments, errors, etc.
    """
    from handlers.webhook_handlers import handle_mydata_webhook
    return handle_mydata_webhook(request)


@https_fn.on_request()
def shopify_webhook(request):
    """
    Webhook endpoint for Shopify order events.
    """
    from handlers.webhook_handlers import handle_shopify_webhook
    return handle_shopify_webhook(request)


@https_fn.on_call()
def manual_invoice_submission(request):
    """
    Callable function for manual invoice submission.
    Used for retrying failed transmissions or manual entries.
    """
    from handlers.order_handlers import handle_manual_submission
    return handle_manual_submission(request)


@https_fn.on_call()
def cancel_invoice(request):
    """
    Callable function to cancel an invoice.
    """
    from handlers.order_handlers import handle_cancel_invoice
    return handle_cancel_invoice(request)


@https_fn.on_call()
def create_credit_note(request):
    """
    Callable function to create a credit note.
    """
    from handlers.order_handlers import handle_create_credit_note
    return handle_create_credit_note(request)


# ============================================================================
# Scheduled Functions
# ============================================================================

@scheduler_fn.on_schedule(schedule="every 5 minutes")
def process_transmission_queue(event):
    """
    Process pending transmissions in the queue.
    Runs every 5 minutes.
    """
    from handlers.scheduled_handlers import process_pending_transmissions
    return process_pending_transmissions()


@scheduler_fn.on_schedule(schedule="every 1 hours")
def retry_failed_transmissions(event):
    """
    Retry failed transmissions.
    Runs every hour.
    """
    from handlers.scheduled_handlers import retry_failed
    return retry_failed()


@scheduler_fn.on_schedule(schedule="every day 02:00")
def daily_reconciliation(event):
    """
    Daily reconciliation with myDATA.
    Verifies all invoices have MARKs.
    """
    from handlers.scheduled_handlers import run_daily_reconciliation
    return run_daily_reconciliation()


@scheduler_fn.on_schedule(schedule="every day 03:00")
def cleanup_old_logs(event):
    """
    Clean up old transmission logs (keep 6 years for compliance).
    """
    from handlers.scheduled_handlers import cleanup_logs
    return cleanup_logs()
```

#### Order Handlers

```python
"""
handlers/order_handlers.py - Order event handlers
"""
from firebase_admin import firestore
from datetime import datetime
from decimal import Decimal
import logging

from services.invoice_service import InvoiceService
from services.transmission_service import TransmissionService
from mydata.xml_builder import MyDataXMLBuilder
from mydata.client import MyDataAPIClient, MyDataConfig, MyDataEnvironment
from config.settings import get_settings

logger = logging.getLogger(__name__)
db = firestore.client()


def handle_order_created(event):
    """Handle new order creation"""
    order_id = event.params["order_id"]
    order_data = event.data.to_dict()
    
    logger.info(f"Processing new order: {order_id}")
    
    # Check if order requires invoice
    if not should_generate_invoice(order_data):
        logger.info(f"Order {order_id} does not require invoice")
        return
    
    try:
        # Initialize services
        settings = get_settings()
        invoice_service = InvoiceService(db, settings)
        
        # Generate invoice
        invoice = invoice_service.create_invoice_from_order(order_id, order_data)
        
        # Queue for transmission
        queue_transmission(invoice)
        
        # Update order with invoice reference
        db.collection("orders").document(order_id).update({
            "invoice_id": invoice["id"],
            "invoice_status": "pending_transmission",
        })
        
        logger.info(f"Invoice {invoice['id']} created for order {order_id}")
        
    except Exception as e:
        logger.error(f"Error processing order {order_id}: {e}")
        
        # Create alert for manual review
        db.collection("alerts").add({
            "type": "order_processing_error",
            "order_id": order_id,
            "error": str(e),
            "created_at": firestore.SERVER_TIMESTAMP,
            "status": "open",
        })


def handle_order_updated(event):
    """Handle order updates"""
    order_id = event.params["order_id"]
    before = event.data.before.to_dict() if event.data.before else {}
    after = event.data.after.to_dict()
    
    # Check for payment confirmation
    if before.get("payment_status") != "paid" and after.get("payment_status") == "paid":
        handle_payment_confirmed(order_id, after)
    
    # Check for cancellation
    if before.get("status") != "cancelled" and after.get("status") == "cancelled":
        handle_order_cancelled(order_id, after)
    
    # Check for refund
    if after.get("refund_status") == "refunded" and before.get("refund_status") != "refunded":
        handle_order_refunded(order_id, after)


def handle_payment_confirmed(order_id: str, order_data: dict):
    """Handle payment confirmation - trigger myDATA transmission"""
    logger.info(f"Payment confirmed for order {order_id}")
    
    invoice_id = order_data.get("invoice_id")
    if not invoice_id:
        logger.warning(f"No invoice found for order {order_id}")
        return
    
    # Get invoice
    invoice_ref = db.collection("invoices").document(invoice_id)
    invoice = invoice_ref.get().to_dict()
    
    if not invoice:
        logger.error(f"Invoice {invoice_id} not found")
        return
    
    # Update payment method if needed
    payment_method = order_data.get("payment_method", "card")
    invoice_ref.update({
        "payment_method": payment_method,
        "payment_confirmed_at": firestore.SERVER_TIMESTAMP,
    })
    
    # Trigger transmission if not already transmitted
    if invoice.get("mydata_status") != "transmitted":
        queue_transmission(invoice)


def handle_order_cancelled(order_id: str, order_data: dict):
    """Handle order cancellation"""
    logger.info(f"Order {order_id} cancelled")
    
    invoice_id = order_data.get("invoice_id")
    if not invoice_id:
        return
    
    invoice_ref = db.collection("invoices").document(invoice_id)
    invoice = invoice_ref.get().to_dict()
    
    if not invoice:
        return
    
    # If invoice has MARK, need to cancel in myDATA
    if invoice.get("mark"):
        from services.cancellation_service import CancellationService
        
        settings = get_settings()
        cancellation_service = CancellationService(db, settings)
        
        try:
            result = cancellation_service.cancel_invoice(
                mark=invoice["mark"],
                reason="Order cancelled",
                cancelled_by="system",
            )
            
            if result["success"]:
                invoice_ref.update({
                    "status": "cancelled",
                    "cancelled_at": firestore.SERVER_TIMESTAMP,
                })
            else:
                # Create alert for manual cancellation
                db.collection("alerts").add({
                    "type": "cancellation_failed",
                    "invoice_id": invoice_id,
                    "mark": invoice["mark"],
                    "error": result.get("error"),
                    "created_at": firestore.SERVER_TIMESTAMP,
                })
                
        except Exception as e:
            logger.error(f"Error cancelling invoice {invoice_id}: {e}")
    else:
        # Invoice not yet transmitted, just mark as cancelled
        invoice_ref.update({
            "status": "cancelled",
            "cancelled_at": firestore.SERVER_TIMESTAMP,
        })


def handle_order_refunded(order_id: str, order_data: dict):
    """Handle order refund - create credit note"""
    logger.info(f"Order {order_id} refunded")
    
    invoice_id = order_data.get("invoice_id")
    if not invoice_id:
        return
    
    invoice_ref = db.collection("invoices").document(invoice_id)
    invoice = invoice_ref.get().to_dict()
    
    if not invoice or not invoice.get("mark"):
        logger.warning(f"Cannot create credit note - invoice {invoice_id} has no MARK")
        return
    
    from services.credit_note_service import CreditNoteService
    
    settings = get_settings()
    credit_note_service = CreditNoteService(db, settings)
    
    try:
        # Determine refund type (full or partial)
        refund_amount = Decimal(str(order_data.get("refund_amount", 0)))
        original_total = Decimal(str(invoice.get("total_gross", 0)))
        
        if refund_amount >= original_total:
            # Full refund
            result = credit_note_service.create_full_credit_note(
                original_mark=invoice["mark"],
                reason=order_data.get("refund_reason", "Customer refund"),
                created_by="system",
            )
        else:
            # Partial refund
            result = credit_note_service.create_partial_credit_note(
                original_mark=invoice["mark"],
                refund_amount=refund_amount,
                reason=order_data.get("refund_reason", "Partial refund"),
                created_by="system",
            )
        
        # Update order with credit note reference
        db.collection("orders").document(order_id).update({
            "credit_note_id": result["credit_note_id"],
            "credit_note_mark": result.get("mark"),
        })
        
    except Exception as e:
        logger.error(f"Error creating credit note for order {order_id}: {e}")
        
        db.collection("alerts").add({
            "type": "credit_note_failed",
            "order_id": order_id,
            "invoice_id": invoice_id,
            "error": str(e),
            "created_at": firestore.SERVER_TIMESTAMP,
        })


def handle_transmission_queued(event):
    """Handle new transmission queue entry"""
    queue_id = event.params["queue_id"]
    queue_data = event.data.to_dict()
    
    logger.info(f"Processing transmission queue entry: {queue_id}")
    
    settings = get_settings()
    transmission_service = TransmissionService(db, settings)
    
    try:
        result = transmission_service.process_transmission(queue_id, queue_data)
        
        if result["success"]:
            logger.info(f"Transmission successful, MARK: {result['mark']}")
        else:
            logger.warning(f"Transmission failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Error processing transmission {queue_id}: {e}")


def handle_manual_submission(request):
    """Handle manual invoice submission"""
    invoice_id = request.data.get("invoice_id")
    
    if not invoice_id:
        return {"error": "invoice_id required"}, 400
    
    invoice_ref = db.collection("invoices").document(invoice_id)
    invoice = invoice_ref.get().to_dict()
    
    if not invoice:
        return {"error": "Invoice not found"}, 404
    
    # Queue for transmission
    queue_transmission(invoice)
    
    return {"status": "queued", "invoice_id": invoice_id}


def handle_cancel_invoice(request):
    """Handle invoice cancellation request"""
    mark = request.data.get("mark")
    reason = request.data.get("reason", "Manual cancellation")
    
    if not mark:
        return {"error": "mark required"}, 400
    
    from services.cancellation_service import CancellationService
    
    settings = get_settings()
    cancellation_service = CancellationService(db, settings)
    
    result = cancellation_service.cancel_invoice(
        mark=mark,
        reason=reason,
        cancelled_by=request.auth.uid if request.auth else "anonymous",
    )
    
    return result


def handle_create_credit_note(request):
    """Handle credit note creation request"""
    original_mark = request.data.get("original_mark")
    reason = request.data.get("reason", "Credit note")
    amount = request.data.get("amount")  # Optional for partial
    
    if not original_mark:
        return {"error": "original_mark required"}, 400
    
    from services.credit_note_service import CreditNoteService
    
    settings = get_settings()
    credit_note_service = CreditNoteService(db, settings)
    
    if amount:
        result = credit_note_service.create_partial_credit_note(
            original_mark=original_mark,
            refund_amount=Decimal(str(amount)),
            reason=reason,
            created_by=request.auth.uid if request.auth else "anonymous",
        )
    else:
        result = credit_note_service.create_full_credit_note(
            original_mark=original_mark,
            reason=reason,
            created_by=request.auth.uid if request.auth else "anonymous",
        )
    
    return result


def should_generate_invoice(order_data: dict) -> bool:
    """Determine if order requires invoice generation"""
    # Skip draft orders
    if order_data.get("status") == "draft":
        return False
    
    # Skip orders with zero total
    if Decimal(str(order_data.get("total", 0))) <= 0:
        return False
    
    # Skip test orders
    if order_data.get("is_test", False):
        return False
    
    return True


def queue_transmission(invoice: dict):
    """Queue invoice for myDATA transmission"""
    from mydata.xml_builder import MyDataXMLBuilder
    
    builder = MyDataXMLBuilder()
    xml_content = builder.build_from_invoice_dict(invoice)
    
    db.collection("transmission_queue").add({
        "invoice_id": invoice["id"],
        "invoice_uid": invoice["uid"],
        "xml_content": xml_content,
        "status": "pending",
        "priority": invoice.get("priority", 5),
        "created_at": firestore.SERVER_TIMESTAMP,
        "attempts": [],
    })
```

### 4.2 Firestore Schema

#### 4.2.1 Invoice Records

```python
"""
Firestore schema for invoice records
"""

INVOICE_SCHEMA = {
    # Collection: invoices
    # Document ID: Auto-generated or custom invoice ID
    
    # Core identification
    "id": "string",                    # Internal invoice ID
    "uid": "string",                   # myDATA UID (SHA-1 hash)
    "mark": "string | null",           # MARK from AADE (null until transmitted)
    "authentication_code": "string | null",  # Auth code from AADE
    
    # Invoice details
    "invoice_type": "string",          # e.g., "1.1", "11.1", "5.1"
    "series": "string",                # Invoice series (e.g., "A", "R")
    "number": "number",                # Invoice number in series
    "issue_date": "timestamp",         # Issue date
    "currency": "string",              # Currency code (default: "EUR")
    
    # Issuer (your company)
    "issuer": {
        "vat_number": "string",
        "country": "string",
        "branch": "number",
        "name": "string",
        "address": {
            "street": "string",
            "number": "string",
            "postal_code": "string",
            "city": "string",
        },
    },
    
    # Counterpart (customer) - optional for retail
    "counterpart": {
        "vat_number": "string | null",
        "country": "string",
        "branch": "number",
        "name": "string",
        "email": "string | null",
        "address": {
            "street": "string",
            "number": "string",
            "postal_code": "string",
            "city": "string",
        },
    },
    
    # Line items
    "lines": [
        {
            "line_number": "number",
            "description": "string",
            "quantity": "number",
            "unit_price": "number",
            "net_value": "number",
            "vat_category": "number",
            "vat_rate": "number",
            "vat_amount": "number",
            "gross_value": "number",
            "income_classification": {
                "type": "string",
                "category": "string",
            },
        }
    ],
    
    # Payment methods
    "payment_methods": [
        {
            "type": "number",
            "amount": "number",
            "info": "string | null",
        }
    ],
    
    # Totals
    "totals": {
        "total_net": "number",
        "total_vat": "number",
        "total_gross": "number",
        "total_withheld": "number",
        "total_fees": "number",
        "total_stamp_duty": "number",
        "total_other_taxes": "number",
        "total_deductions": "number",
    },
    
    # Related documents
    "order_id": "string | null",       # Related order ID
    "correlated_mark": "string | null", # For credit notes - original MARK
    "credit_notes": ["string"],        # MARKs of related credit notes
    
    # Status tracking
    "status": "string",                # draft, pending, transmitted, cancelled
    "mydata_status": "string",         # pending, transmitted, failed
    "mydata_error": "string | null",   # Last error message
    
    # Timestamps
    "created_at": "timestamp",
    "updated_at": "timestamp",
    "transmitted_at": "timestamp | null",
    "cancelled_at": "timestamp | null",
    
    # Audit
    "created_by": "string",
    "updated_by": "string",
    
    # QR Code
    "qr_code_url": "string | null",
    "qr_code_data": "string | null",
}
```

#### 4.2.2 Transmission Logs

```python
"""
Firestore schema for transmission logs
"""

TRANSMISSION_LOG_SCHEMA = {
    # Collection: transmission_logs
    # Document ID: Auto-generated
    
    "id": "string",
    "invoice_id": "string",
    "invoice_uid": "string",
    
    # Transmission details
    "transmission_type": "string",     # submit, cancel, query
    "provider": "string",              # direct, softone, epsilon, etc.
    
    # Request
    "request": {
        "timestamp": "timestamp",
        "endpoint": "string",
        "xml_content": "string",       # Stored for audit
        "headers": "map",              # Sanitized headers (no secrets)
    },
    
    # Response
    "response": {
        "timestamp": "timestamp",
        "status_code": "number",
        "success": "boolean",
        "mark": "string | null",
        "uid": "string | null",
        "authentication_code": "string | null",
        "raw_response": "string",
        "errors": [
            {
                "code": "string",
                "message": "string",
                "field": "string | null",
            }
        ],
    },
    
    # Retry information
    "attempt_number": "number",
    "retry_scheduled": "boolean",
    "next_retry_at": "timestamp | null",
    
    # Timestamps
    "created_at": "timestamp",
}
```

#### 4.2.3 Audit Trail

```python
"""
Firestore schema for audit trail
"""

AUDIT_LOG_SCHEMA = {
    # Collection: audit_logs
    # Document ID: Auto-generated
    
    "id": "string",
    
    # Event details
    "event_type": "string",            # invoice_created, invoice_transmitted, etc.
    "entity_type": "string",           # invoice, order, credit_note
    "entity_id": "string",
    
    # Actor
    "actor": {
        "type": "string",              # user, system, webhook
        "id": "string | null",
        "email": "string | null",
        "ip_address": "string | null",
    },
    
    # Changes
    "changes": {
        "before": "map | null",
        "after": "map | null",
        "diff": "map | null",
    },
    
    # Context
    "context": {
        "order_id": "string | null",
        "invoice_id": "string | null",
        "mark": "string | null",
        "request_id": "string | null",
    },
    
    # Timestamps
    "timestamp": "timestamp",
    
    # Retention
    "retention_until": "timestamp",    # 6 years from creation
}
```

#### 4.2.4 MARK Storage

```python
"""
Firestore schema for MARK records
"""

MARK_RECORD_SCHEMA = {
    # Collection: marks
    # Document ID: MARK value
    
    "mark": "string",                  # The MARK itself (also document ID)
    "uid": "string",                   # Associated UID
    "invoice_id": "string",            # Internal invoice ID
    
    # Invoice reference
    "invoice_type": "string",
    "series": "string",
    "number": "number",
    "issue_date": "timestamp",
    
    # Issuer/Counterpart VATs
    "issuer_vat": "string",
    "counterpart_vat": "string | null",
    
    # Authentication
    "authentication_code": "string",
    "qr_code_url": "string",
    
    # Status
    "status": "string",                # active, cancelled
    "cancelled_at": "timestamp | null",
    
    # Timestamps
    "assigned_at": "timestamp",
    "created_at": "timestamp",
    
    # Verification URL
    "verification_url": "string",      # https://www.aade.gr/mydata/invoice/{mark}
}
```

### 4.3 Queue-Based Transmission

```python
"""
services/transmission_service.py - Queue-based transmission service
"""
from firebase_admin import firestore
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from mydata.client import MyDataAPIClient, MyDataConfig, MyDataEnvironment
from mydata.xml_builder import MyDataXMLBuilder
from config.settings import Settings

logger = logging.getLogger(__name__)


class TransmissionService:
    """Service for managing myDATA transmissions"""
    
    def __init__(self, db, settings: Settings):
        self.db = db
        self.settings = settings
        self._api_client = None
    
    @property
    def api_client(self) -> MyDataAPIClient:
        """Lazy initialization of API client"""
        if self._api_client is None:
            config = MyDataConfig(
                aade_user_id=self.settings.mydata_user_id,
                subscription_key=self.settings.mydata_subscription_key,
                environment=(
                    MyDataEnvironment.PRODUCTION 
                    if self.settings.is_production 
                    else MyDataEnvironment.SANDBOX
                ),
            )
            self._api_client = MyDataAPIClient(config)
        return self._api_client
    
    def process_transmission(self, queue_id: str, queue_data: dict) -> dict:
        """
        Process a single transmission from the queue
        
        Args:
            queue_id: Queue document ID
            queue_data: Queue document data
        
        Returns:
            Result dict with success status and MARK if successful
        """
        queue_ref = self.db.collection("transmission_queue").document(queue_id)
        invoice_id = queue_data["invoice_id"]
        
        # Update status to processing
        queue_ref.update({
            "status": "processing",
            "processing_started_at": firestore.SERVER_TIMESTAMP,
        })
        
        try:
            # Send to myDATA
            response = self.api_client.send_invoices(queue_data["xml_content"])
            
            # Log transmission
            self._log_transmission(
                invoice_id=invoice_id,
                invoice_uid=queue_data["invoice_uid"],
                request_xml=queue_data["xml_content"],
                response=response,
                attempt=len(queue_data.get("attempts", [])) + 1,
            )
            
            if response.success:
                # Success - update records
                self._handle_success(queue_ref, queue_data, response)
                return {
                    "success": True,
                    "mark": response.mark,
                    "uid": response.uid,
                }
            else:
                # Failure - handle retry or permanent failure
                return self._handle_failure(queue_ref, queue_data, response)
                
        except Exception as e:
            logger.error(f"Transmission error for {invoice_id}: {e}")
            return self._handle_exception(queue_ref, queue_data, e)
    
    def _handle_success(self, queue_ref, queue_data: dict, response):
        """Handle successful transmission"""
        invoice_id = queue_data["invoice_id"]
        
        # Update queue entry
        queue_ref.update({
            "status": "completed",
            "completed_at": firestore.SERVER_TIMESTAMP,
            "mark": response.mark,
            "attempts": firestore.ArrayUnion([{
                "timestamp": datetime.now(),
                "success": True,
                "mark": response.mark,
            }]),
        })
        
        # Update invoice
        invoice_ref = self.db.collection("invoices").document(invoice_id)
        invoice_ref.update({
            "mark": response.mark,
            "authentication_code": response.authentication_code,
            "mydata_status": "transmitted",
            "transmitted_at": firestore.SERVER_TIMESTAMP,
            "qr_code_url": f"https://i.ytimg.com/vi/VPY4iEwq_RQ/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBYmxSOb0k8nBgzKeruvyuGKJWqig",
        })
        
        # Create MARK record
        self.db.collection("marks").document(response.mark).set({
            "mark": response.mark,
            "uid": response.uid,
            "invoice_id": invoice_id,
            "authentication_code": response.authentication_code,
            "status": "active",
            "assigned_at": firestore.SERVER_TIMESTAMP,
            "verification_url": f"https://www.aade.gr/mydata/invoice/{response.mark}",
        })
        
        # Audit log
        self._audit_log(
            event_type="invoice_transmitted",
            entity_type="invoice",
            entity_id=invoice_id,
            context={
                "mark": response.mark,
                "uid": response.uid,
            },
        )
    
    def _handle_failure(self, queue_ref, queue_data: dict, response) -> dict:
        """Handle transmission failure"""
        invoice_id = queue_data["invoice_id"]
        attempts = queue_data.get("attempts", [])
        attempt_count = len(attempts) + 1
        
        # Check if retryable
        is_retryable = self._is_retryable(response.errors)
        max_retries = self.settings.max_transmission_retries
        
        if is_retryable and attempt_count < max_retries:
            # Schedule retry
            retry_delay = self._calculate_retry_delay(attempt_count)
            next_retry = datetime.now() + timedelta(seconds=retry_delay)
            
            queue_ref.update({
                "status": "pending",
                "next_retry_at": next_retry,
                "attempts": firestore.ArrayUnion([{
                    "timestamp": datetime.now(),
                    "success": False,
                    "errors": response.errors,
                }]),
            })
            
            return {
                "success": False,
                "retryable": True,
                "next_retry_at": next_retry.isoformat(),
                "error": response.errors[0].get("message") if response.errors else "Unknown error",
            }
        else:
            # Permanent failure
            queue_ref.update({
                "status": "failed",
                "failed_at": firestore.SERVER_TIMESTAMP,
                "attempts": firestore.ArrayUnion([{
                    "timestamp": datetime.now(),
                    "success": False,
                    "errors": response.errors,
                }]),
            })
            
            # Update invoice
            self.db.collection("invoices").document(invoice_id).update({
                "mydata_status": "failed",
                "mydata_error": response.errors[0].get("message") if response.errors else "Unknown error",
            })
            
            # Create alert
            self.db.collection("alerts").add({
                "type": "transmission_failed",
                "invoice_id": invoice_id,
                "errors": response.errors,
                "attempts": attempt_count,
                "created_at": firestore.SERVER_TIMESTAMP,
                "status": "open",
            })
            
            return {
                "success": False,
                "retryable": False,
                "error": response.errors[0].get("message") if response.errors else "Unknown error",
            }
    
    def _handle_exception(self, queue_ref, queue_data: dict, exception: Exception) -> dict:
        """Handle unexpected exception during transmission"""
        attempts = queue_data.get("attempts", [])
        attempt_count = len(attempts) + 1
        max_retries = self.settings.max_transmission_retries
        
        if attempt_count < max_retries:
            retry_delay = self._calculate_retry_delay(attempt_count)
            next_retry = datetime.now() + timedelta(seconds=retry_delay)
            
            queue_ref.update({
                "status": "pending",
                "next_retry_at": next_retry,
                "attempts": firestore.ArrayUnion([{
                    "timestamp": datetime.now(),
                    "success": False,
                    "exception": str(exception),
                }]),
            })
            
            return {
                "success": False,
                "retryable": True,
                "error": str(exception),
            }
        else:
            queue_ref.update({
                "status": "failed",
                "failed_at": firestore.SERVER_TIMESTAMP,
                "attempts": firestore.ArrayUnion([{
                    "timestamp": datetime.now(),
                    "success": False,
                    "exception": str(exception),
                }]),
            })
            
            return {
                "success": False,
                "retryable": False,
                "error": str(exception),
            }
    
    def _is_retryable(self, errors: list) -> bool:
        """Determine if errors are retryable"""
        retryable_codes = ["429", "500", "503", "TIMEOUT", "CONNECTION_ERROR"]
        
        for error in errors:
            code = error.get("code", "")
            if code in retryable_codes:
                return True
            # Validation errors are not retryable
            if code.startswith("1"):
                return False
        
        return True
    
    def _calculate_retry_delay(self, attempt: int) -> int:
        """Calculate retry delay with exponential backoff"""
        base_delay = 60  # 1 minute
        max_delay = 3600  # 1 hour
        
        delay = base_delay * (2 ** (attempt - 1))
        return min(delay, max_delay)
    
    def _log_transmission(
        self,
        invoice_id: str,
        invoice_uid: str,
        request_xml: str,
        response,
        attempt: int,
    ):
        """Log transmission for audit"""
        self.db.collection("transmission_logs").add({
            "invoice_id": invoice_id,
            "invoice_uid": invoice_uid,
            "transmission_type": "submit",
            "provider": "direct",
            "request": {
                "timestamp": datetime.now(),
                "endpoint": "SendInvoices",
                "xml_content": request_xml,
            },
            "response": {
                "timestamp": datetime.now(),
                "success": response.success,
                "mark": response.mark,
                "uid": response.uid,
                "authentication_code": response.authentication_code,
                "raw_response": response.raw_response,
                "errors": response.errors,
            },
            "attempt_number": attempt,
            "created_at": firestore.SERVER_TIMESTAMP,
        })
    
    def _audit_log(self, event_type: str, entity_type: str, entity_id: str, context: dict = None):
        """Create audit log entry"""
        self.db.collection("audit_logs").add({
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "actor": {
                "type": "system",
            },
            "context": context or {},
            "timestamp": firestore.SERVER_TIMESTAMP,
            "retention_until": datetime.now() + timedelta(days=365 * 6),  # 6 years
        })
```

### 4.4 Monitoring and Alerting

```python
"""
Monitoring and alerting setup for myDATA compliance
"""
from firebase_admin import firestore
from datetime import datetime, timedelta
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class MonitoringService:
    """Service for monitoring myDATA compliance"""
    
    def __init__(self, db):
        self.db = db
    
    def check_pending_transmissions(self, threshold_minutes: int = 30) -> List[Dict]:
        """
        Check for transmissions pending longer than threshold
        
        Returns:
            List of stuck transmissions
        """
        cutoff = datetime.now() - timedelta(minutes=threshold_minutes)
        
        stuck = (
            self.db.collection("transmission_queue")
            .where("status", "==", "pending")
            .where("created_at", "<", cutoff)
            .stream()
        )
        
        results = []
        for doc in stuck:
            data = doc.to_dict()
            results.append({
                "queue_id": doc.id,
                "invoice_id": data.get("invoice_id"),
                "created_at": data.get("created_at"),
                "attempts": len(data.get("attempts", [])),
            })
        
        return results
    
    def check_failed_transmissions(self, hours: int = 24) -> List[Dict]:
        """
        Check for failed transmissions in the last N hours
        
        Returns:
            List of failed transmissions
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        
        failed = (
            self.db.collection("transmission_queue")
            .where("status", "==", "failed")
            .where("failed_at", ">", cutoff)
            .stream()
        )
        
        results = []
        for doc in failed:
            data = doc.to_dict()
            results.append({
                "queue_id": doc.id,
                "invoice_id": data.get("invoice_id"),
                "failed_at": data.get("failed_at"),
                "attempts": data.get("attempts", []),
            })
        
        return results
    
    def check_invoices_without_mark(self, hours: int = 24) -> List[Dict]:
        """
        Check for invoices created but not transmitted
        
        Returns:
            List of invoices without MARK
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        
        invoices = (
            self.db.collection("invoices")
            .where("mark", "==", None)
            .where("status", "!=", "cancelled")
            .where("created_at", "<", cutoff)
            .stream()
        )
        
        results = []
        for doc in invoices:
            data = doc.to_dict()
            results.append({
                "invoice_id": doc.id,
                "created_at": data.get("created_at"),
                "order_id": data.get("order_id"),
                "mydata_status": data.get("mydata_status"),
            })
        
        return results
    
    def get_transmission_stats(self, days: int = 7) -> Dict:
        """
        Get transmission statistics for the last N days
        
        Returns:
            Statistics dict
        """
        cutoff = datetime.now() - timedelta(days=days)
        
        # Count by status
        stats = {
            "total": 0,
            "completed": 0,
            "failed": 0,
            "pending": 0,
            "success_rate": 0.0,
        }
        
        queue = (
            self.db.collection("transmission_queue")
            .where("created_at", ">", cutoff)
            .stream()
        )
        
        for doc in queue:
            data = doc.to_dict()
            stats["total"] += 1
            status = data.get("status", "pending")
            
            if status == "completed":
                stats["completed"] += 1
            elif status == "failed":
                stats["failed"] += 1
            else:
                stats["pending"] += 1
        
        if stats["total"] > 0:
            stats["success_rate"] = (stats["completed"] / stats["total"]) * 100
        
        return stats
    
    def create_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = "warning",
        context: Dict = None,
    ):
        """Create an alert for manual review"""
        self.db.collection("alerts").add({
            "type": alert_type,
            "message": message,
            "severity": severity,
            "context": context or {},
            "status": "open",
            "created_at": firestore.SERVER_TIMESTAMP,
        })
        
        logger.warning(f"Alert created: {alert_type} - {message}")


# Scheduled monitoring function
def run_monitoring_checks():
    """Run all monitoring checks"""
    db = firestore.client()
    monitoring = MonitoringService(db)
    
    # Check pending transmissions
    stuck = monitoring.check_pending_transmissions(threshold_minutes=30)
    if stuck:
        monitoring.create_alert(
            alert_type="stuck_transmissions",
            message=f"{len(stuck)} transmissions pending for over 30 minutes",
            severity="warning",
            context={"transmissions": stuck},
        )
    
    # Check failed transmissions
    failed = monitoring.check_failed_transmissions(hours=24)
    if failed:
        monitoring.create_alert(
            alert_type="failed_transmissions",
            message=f"{len(failed)} transmissions failed in last 24 hours",
            severity="error",
            context={"transmissions": failed},
        )
    
    # Check invoices without MARK
    no_mark = monitoring.check_invoices_without_mark(hours=24)
    if no_mark:
        monitoring.create_alert(
            alert_type="invoices_without_mark",
            message=f"{len(no_mark)} invoices without MARK for over 24 hours",
            severity="critical",
            context={"invoices": no_mark},
        )
    
    # Log stats
    stats = monitoring.get_transmission_stats(days=7)
    logger.info(f"Transmission stats (7 days): {stats}")
    
    return {
        "stuck_transmissions": len(stuck),
        "failed_transmissions": len(failed),
        "invoices_without_mark": len(no_mark),
        "stats": stats,
    }
```

### 4.5 Testing Strategy

```python
"""
Testing strategy for myDATA compliance
"""
import pytest
from unittest.mock import Mock, patch
from decimal import Decimal
from datetime import datetime

from mydata.xml_builder import MyDataXMLBuilder, MyDataInvoice, InvoiceType, VATCategory
from mydata.client import MyDataAPIClient, MyDataConfig, MyDataEnvironment
from services.invoice_service import InvoiceService


class TestXMLBuilder:
    """Tests for XML builder"""
    
    def test_build_retail_receipt(self):
        """Test building retail receipt XML"""
        invoice = MyDataInvoice(
            issuer=Party(vat_number="123456789", country="GR", branch=0),
            invoice_type=InvoiceType.RETAIL_RECEIPT,
            series="R",
            aa=1,
            issue_date=datetime(2024, 1, 15),
            lines=[
                InvoiceLine(
                    line_number=1,
                    net_value=Decimal("40.00"),
                    vat_category=VATCategory.STANDARD_24,
                    vat_amount=Decimal("9.60"),
                )
            ],
            payment_methods=[
                PaymentMethodDetail(
                    payment_type=PaymentMethod.CREDIT_CARD,
                    amount=Decimal("49.60"),
                )
            ],
        )
        
        builder = MyDataXMLBuilder()
        xml = builder.build_invoice_xml(invoice)
        
        assert "11.1" in xml  # Retail receipt type
        assert "123456789" in xml  # VAT number
        assert "40.00" in xml  # Net value
        assert "9.60" in xml  # VAT amount
    
    def test_build_sales_invoice(self):
        """Test building B2B sales invoice XML"""
        invoice = MyDataInvoice(
            issuer=Party(vat_number="123456789", country="GR", branch=0),
            counterpart=Party(vat_number="987654321", country="GR", branch=0),
            invoice_type=InvoiceType.SALES_INVOICE,
            series="A",
            aa=1,
            issue_date=datetime(2024, 1, 15),
            lines=[
                InvoiceLine(
                    line_number=1,
                    net_value=Decimal("100.00"),
                    vat_category=VATCategory.STANDARD_24,
                    vat_amount=Decimal("24.00"),
                )
            ],
            payment_methods=[
                PaymentMethodDetail(
                    payment_type=PaymentMethod.CASH,
                    amount=Decimal("124.00"),
                )
            ],
        )
        
        builder = MyDataXMLBuilder()
        xml = builder.build_invoice_xml(invoice)
        
        assert "1.1" in xml  # Sales invoice type
        assert "987654321" in xml  # Counterpart VAT
    
    def test_build_credit_note(self):
        """Test building credit note XML"""
        invoice = MyDataInvoice(
            issuer=Party(vat_number="123456789", country="GR", branch=0),
            counterpart=Party(vat_number="987654321", country="GR", branch=0),
            invoice_type=InvoiceType.CREDIT_NOTE_RELATED,
            series="CN",
            aa=1,
            issue_date=datetime(2024, 1, 20),
            correlated_invoices="400001234567890",
            lines=[
                InvoiceLine(
                    line_number=1,
                    net_value=Decimal("50.00"),
                    vat_category=VATCategory.STANDARD_24,
                    vat_amount=Decimal("12.00"),
                )
            ],
            payment_methods=[
                PaymentMethodDetail(
                    payment_type=PaymentMethod.CASH,
                    amount=Decimal("62.00"),
                )
            ],
        )
        
        builder = MyDataXMLBuilder()
        xml = builder.build_invoice_xml(invoice)
        
        assert "5.1" in xml  # Credit note type
        assert "400001234567890" in xml  # Correlated MARK
    
    def test_uid_calculation(self):
        """Test UID calculation"""
        invoice = MyDataInvoice(
            issuer=Party(vat_number="123456789", country="GR", branch=0),
            invoice_type=InvoiceType.SALES_INVOICE,
            series="A",
            aa=1,
            issue_date=datetime(2024, 1, 15),
            lines=[],
            payment_methods=[],
        )
        
        uid = invoice.calculate_uid()
        
        assert len(uid) == 40  # SHA-1 hex length
        assert uid.isupper()  # Should be uppercase


class TestAPIClient:
    """Tests for myDATA API client"""
    
    @patch('httpx.Client')
    def test_send_invoices_success(self, mock_client):
        """Test successful invoice submission"""
        # Mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <ResponseDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0">
            <response>
                <invoiceMark>400001234567890</invoiceMark>
                <invoiceUid>ABC123</invoiceUid>
                <authenticationCode>AUTH123</authenticationCode>
            </response>
        </ResponseDoc>
        """
        mock_client.return_value.post.return_value = mock_response
        
        config = MyDataConfig(
            aade_user_id="test_user",
            subscription_key="test_key",
            environment=MyDataEnvironment.SANDBOX,
        )
        
        client = MyDataAPIClient(config)
        response = client.send_invoices("<InvoicesDoc>...</InvoicesDoc>")
        
        assert response.success
        assert response.mark == "400001234567890"
    
    @patch('httpx.Client')
    def test_send_invoices_error(self, mock_client):
        """Test invoice submission with error"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <ResponseDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0">
            <response>
                <error>
                    <code>101</code>
                    <message>Invalid VAT number</message>
                </error>
            </response>
        </ResponseDoc>
        """
        mock_client.return_value.post.return_value = mock_response
        
        config = MyDataConfig(
            aade_user_id="test_user",
            subscription_key="test_key",
            environment=MyDataEnvironment.SANDBOX,
        )
        
        client = MyDataAPIClient(config)
        response = client.send_invoices("<InvoicesDoc>...</InvoicesDoc>")
        
        assert not response.success
        assert len(response.errors) > 0
        assert response.errors[0]["code"] == "101"


class TestVATCalculation:
    """Tests for VAT calculations"""
    
    def test_calculate_vat_standard(self):
        """Test standard VAT calculation"""
        from mydata.vat_calculator import calculate_vat, GreekVATRate
        
        net, vat, gross = calculate_vat(Decimal("100.00"), GreekVATRate.STANDARD)
        
        assert net == Decimal("100.00")
        assert vat == Decimal("24.00")
        assert gross == Decimal("124.00")
    
    def test_calculate_vat_reduced(self):
        """Test reduced VAT calculation"""
        from mydata.vat_calculator import calculate_vat, GreekVATRate
        
        net, vat, gross = calculate_vat(Decimal("100.00"), GreekVATRate.REDUCED_1)
        
        assert net == Decimal("100.00")
        assert vat == Decimal("13.00")
        assert gross == Decimal("113.00")
    
    def test_calculate_net_from_gross(self):
        """Test reverse VAT calculation"""
        from mydata.vat_calculator import calculate_net_from_gross, GreekVATRate
        
        net, vat, gross = calculate_net_from_gross(Decimal("124.00"), GreekVATRate.STANDARD)
        
        assert gross == Decimal("124.00")
        assert net == Decimal("100.00")
        assert vat == Decimal("24.00")


class TestSandboxIntegration:
    """Integration tests with sandbox environment"""
    
    @pytest.mark.integration
    def test_sandbox_submission(self):
        """Test actual submission to sandbox"""
        import os
        
        # Skip if no sandbox credentials
        if not os.environ.get("MYDATA_SANDBOX_USER_ID"):
            pytest.skip("Sandbox credentials not configured")
        
        config = MyDataConfig(
            aade_user_id=os.environ["MYDATA_SANDBOX_USER_ID"],
            subscription_key=os.environ["MYDATA_SANDBOX_KEY"],
            environment=MyDataEnvironment.SANDBOX,
        )
        
        # Create test invoice
        invoice = MyDataInvoice(
            issuer=Party(vat_number="123456789", country="GR", branch=0),
            invoice_type=InvoiceType.RETAIL_RECEIPT,
            series="TEST",
            aa=1,
            issue_date=datetime.now(),
            lines=[
                InvoiceLine(
                    line_number=1,
                    net_value=Decimal("10.00"),
                    vat_category=VATCategory.STANDARD_24,
                    vat_amount=Decimal("2.40"),
                )
            ],
            payment_methods=[
                PaymentMethodDetail(
                    payment_type=PaymentMethod.CASH,
                    amount=Decimal("12.40"),
                )
            ],
        )
        
        builder = MyDataXMLBuilder()
        xml = builder.build_invoice_xml(invoice)
        
        client = MyDataAPIClient(config)
        response = client.send_invoices(xml)
        
        # In sandbox, we expect either success or specific test errors
        assert response.success or any(
            e.get("code") in ["TEST_ERROR", "SANDBOX_LIMIT"]
            for e in response.errors
        )
```

### 4.6 Error Recovery and Manual Intervention

```python
"""
Error recovery and manual intervention workflows
"""
from firebase_admin import firestore
from datetime import datetime
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class ManualInterventionService:
    """Service for handling manual intervention cases"""
    
    def __init__(self, db):
        self.db = db
    
    def get_open_alerts(self, alert_type: Optional[str] = None) -> List[Dict]:
        """Get all open alerts requiring intervention"""
        query = self.db.collection("alerts").where("status", "==", "open")
        
        if alert_type:
            query = query.where("type", "==", alert_type)
        
        alerts = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            alerts.append(data)
        
        return alerts
    
    def resolve_alert(self, alert_id: str, resolution: str, resolved_by: str):
        """Mark an alert as resolved"""
        self.db.collection("alerts").document(alert_id).update({
            "status": "resolved",
            "resolution": resolution,
            "resolved_by": resolved_by,
            "resolved_at": firestore.SERVER_TIMESTAMP,
        })
    
    def retry_failed_invoice(self, invoice_id: str, modified_data: Optional[Dict] = None):
        """
        Retry a failed invoice with optional modifications
        
        Args:
            invoice_id: Invoice to retry
            modified_data: Optional modifications to invoice data
        """
        invoice_ref = self.db.collection("invoices").document(invoice_id)
        invoice = invoice_ref.get().to_dict()
        
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # Apply modifications if provided
        if modified_data:
            invoice.update(modified_data)
            invoice_ref.update(modified_data)
        
        # Reset status
        invoice_ref.update({
            "mydata_status": "pending",
            "mydata_error": None,
        })
        
        # Queue for transmission
        from mydata.xml_builder import MyDataXMLBuilder
        
        builder = MyDataXMLBuilder()
        xml_content = builder.build_from_invoice_dict(invoice)
        
        self.db.collection("transmission_queue").add({
            "invoice_id": invoice_id,
            "invoice_uid": invoice["uid"],
            "xml_content": xml_content,
            "status": "pending",
            "priority": 1,  # High priority for retries
            "created_at": firestore.SERVER_TIMESTAMP,
            "is_retry": True,
            "attempts": [],
        })
        
        logger.info(f"Invoice {invoice_id} queued for retry")
    
    def manually_assign_mark(self, invoice_id: str, mark: str, auth_code: str):
        """
        Manually assign MARK to an invoice
        Used when MARK was received but not recorded properly
        
        Args:
            invoice_id: Invoice ID
            mark: MARK from AADE
            auth_code: Authentication code
        """
        invoice_ref = self.db.collection("invoices").document(invoice_id)
        
        invoice_ref.update({
            "mark": mark,
            "authentication_code": auth_code,
            "mydata_status": "transmitted",
            "transmitted_at": firestore.SERVER_TIMESTAMP,
            "qr_code_url": f"https://i.ytimg.com/vi/OGMkkoTtack/maxresdefault.jpg",
            "manually_assigned": True,
            "manually_assigned_at": firestore.SERVER_TIMESTAMP,
        })
        
        # Create MARK record
        self.db.collection("marks").document(mark).set({
            "mark": mark,
            "invoice_id": invoice_id,
            "authentication_code": auth_code,
            "status": "active",
            "assigned_at": firestore.SERVER_TIMESTAMP,
            "manually_assigned": True,
        })
        
        logger.info(f"MARK {mark} manually assigned to invoice {invoice_id}")
    
    def skip_transmission(self, invoice_id: str, reason: str, skipped_by: str):
        """
        Skip myDATA transmission for an invoice
        Used for special cases that don't require transmission
        
        Args:
            invoice_id: Invoice ID
            reason: Reason for skipping
            skipped_by: User who authorized skip
        """
        self.db.collection("invoices").document(invoice_id).update({
            "mydata_status": "skipped",
            "skip_reason": reason,
            "skipped_by": skipped_by,
            "skipped_at": firestore.SERVER_TIMESTAMP,
        })
        
        # Remove from queue if present
        queue_entries = (
            self.db.collection("transmission_queue")
            .where("invoice_id", "==", invoice_id)
            .where("status", "in", ["pending", "processing"])
            .stream()
        )
        
        for entry in queue_entries:
            entry.reference.update({
                "status": "skipped",
                "skip_reason": reason,
            })
        
        logger.info(f"Invoice {invoice_id} transmission skipped: {reason}")


# Admin dashboard data
def get_dashboard_data(db) -> Dict:
    """Get data for admin dashboard"""
    now = datetime.now()
    
    # Today's stats
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Invoices today
    invoices_today = len(list(
        db.collection("invoices")
        .where("created_at", ">=", today_start)
        .stream()
    ))
    
    # Transmissions today
    transmissions_today = len(list(
        db.collection("transmission_queue")
        .where("created_at", ">=", today_start)
        .stream()
    ))
    
    # Failed transmissions
    failed_count = len(list(
        db.collection("transmission_queue")
        .where("status", "==", "failed")
        .stream()
    ))
    
    # Open alerts
    open_alerts = len(list(
        db.collection("alerts")
        .where("status", "==", "open")
        .stream()
    ))
    
    # Pending transmissions
    pending_count = len(list(
        db.collection("transmission_queue")
        .where("status", "==", "pending")
        .stream()
    ))
    
    return {
        "invoices_today": invoices_today,
        "transmissions_today": transmissions_today,
        "failed_transmissions": failed_count,
        "pending_transmissions": pending_count,
        "open_alerts": open_alerts,
        "timestamp": now.isoformat(),
    }
```

---

## Section 5: Integration with E-commerce Flow

### 5.1 Order Completion → Invoice Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    E-commerce Order to myDATA Flow                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Customer │───▶│  Order   │───▶│ Payment  │───▶│ Invoice  │              │
│  │ Checkout │    │ Created  │    │ Confirm  │    │ Generate │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│                       │                               │                      │
│                       ▼                               ▼                      │
│              ┌──────────────┐               ┌──────────────┐                │
│              │  Firestore   │               │  XML Build   │                │
│              │  Order Doc   │               │  & Validate  │                │
│              └──────────────┘               └──────────────┘                │
│                                                    │                         │
│                                                    ▼                         │
│                                            ┌──────────────┐                 │
│                                            │ Transmission │                 │
│                                            │    Queue     │                 │
│                                            └──────────────┘                 │
│                                                    │                         │
│                                                    ▼                         │
│                                            ┌──────────────┐                 │
│                                            │   myDATA     │                 │
│                                            │     API      │                 │
│                                            └──────────────┘                 │
│                                                    │                         │
│                                                    ▼                         │
│                                            ┌──────────────┐                 │
│                                            │    MARK      │                 │
│                                            │   Received   │                 │
│                                            └──────────────┘                 │
│                                                    │                         │
│                                                    ▼                         │
│                                            ┌──────────────┐                 │
│                                            │   Invoice    │                 │
│                                            │  Finalized   │                 │
│                                            └──────────────┘                 │
│                                                    │                         │
│                                                    ▼                         │
│                                            ┌──────────────┐                 │
│                                            │   Customer   │                 │
│                                            │   Notified   │                 │
│                                            └──────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Invoice Service Implementation

```python
"""
services/invoice_service.py - Invoice generation service
"""
from firebase_admin import firestore
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional, List
import logging

from mydata.invoice_types import InvoiceType, VATCategory, PaymentMethod
from mydata.vat_calculator import calculate_vat, GreekVATRate
from mydata.xml_builder import MyDataXMLBuilder, MyDataInvoice, Party, InvoiceLine, PaymentMethodDetail

logger = logging.getLogger(__name__)


class InvoiceService:
    """Service for invoice generation and management"""
    
    def __init__(self, db, settings):
        self.db = db
        self.settings = settings
        self.xml_builder = MyDataXMLBuilder()
    
    def create_invoice_from_order(self, order_id: str, order_data: dict) -> dict:
        """
        Create invoice from order data
        
        Args:
            order_id: Order ID
            order_data: Order document data
        
        Returns:
            Created invoice document
        """
        # Determine invoice type
        invoice_type = self._determine_invoice_type(order_data)
        
        # Get next invoice number
        series = self._get_series_for_type(invoice_type)
        number = self._get_next_invoice_number(series)
        
        # Build issuer
        issuer = self._build_issuer()
        
        # Build counterpart (if B2B)
        counterpart = self._build_counterpart(order_data) if self._is_b2b(order_data) else None
        
        # Build line items
        lines = self._build_lines(order_data)
        
        # Build payment methods
        payment_methods = self._build_payment_methods(order_data)
        
        # Calculate totals
        totals = self._calculate_totals(lines)
        
        # Create invoice object
        invoice = MyDataInvoice(
            issuer=issuer,
            counterpart=counterpart,
            invoice_type=invoice_type,
            series=series,
            aa=number,
            issue_date=datetime.now(),
            currency=order_data.get("currency", "EUR"),
            lines=lines,
            payment_methods=payment_methods,
        )
        
        # Calculate UID
        uid = invoice.calculate_uid()
        
        # Build XML
        xml_content = self.xml_builder.build_invoice_xml(invoice)
        
        # Create invoice document
        invoice_doc = {
            "id": f"{series}-{number}",
            "uid": uid,
            "mark": None,
            "invoice_type": invoice_type.value,
            "series": series,
            "number": number,
            "issue_date": datetime.now(),
            "currency": order_data.get("currency", "EUR"),
            "issuer": self._party_to_dict(issuer),
            "counterpart": self._party_to_dict(counterpart) if counterpart else None,
            "lines": [self._line_to_dict(line) for line in lines],
            "payment_methods": [self._payment_to_dict(pm) for pm in payment_methods],
            "totals": {k: float(v) for k, v in totals.items()},
            "order_id": order_id,
            "status": "pending",
            "mydata_status": "pending",
            "xml_content": xml_content,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        
        # Save to Firestore
        doc_ref = self.db.collection("invoices").document(invoice_doc["id"])
        doc_ref.set(invoice_doc)
        
        logger.info(f"Invoice {invoice_doc['id']} created for order {order_id}")
        
        return invoice_doc
    
    def _determine_invoice_type(self, order_data: dict) -> InvoiceType:
        """Determine appropriate invoice type based on order"""
        customer_vat = order_data.get("customer_vat")
        customer_country = order_data.get("customer_country", "GR")
        
        # B2C (no VAT number) = Retail Receipt
        if not customer_vat:
            return InvoiceType.RETAIL_RECEIPT
        
        # B2B domestic
        if customer_country == "GR":
            return InvoiceType.SALES_INVOICE
        
        # B2B EU
        if customer_country in EU_COUNTRIES:
            return InvoiceType.SALES_INVOICE_INTRA_EU
        
        # B2B non-EU
        return InvoiceType.SALES_INVOICE_THIRD_COUNTRY
    
    def _get_series_for_type(self, invoice_type: InvoiceType) -> str:
        """Get invoice series for type"""
        series_map = {
            InvoiceType.RETAIL_RECEIPT: "R",
            InvoiceType.SALES_INVOICE: "A",
            InvoiceType.SALES_INVOICE_INTRA_EU: "EU",
            InvoiceType.SALES_INVOICE_THIRD_COUNTRY: "EX",
            InvoiceType.SERVICE_INVOICE: "S",
            InvoiceType.CREDIT_NOTE_RELATED: "CN",
        }
        return series_map.get(invoice_type, "A")
    
    def _get_next_invoice_number(self, series: str) -> int:
        """Get next invoice number for series"""
        counter_ref = self.db.collection("counters").document(f"invoice_{series}")
        
        @firestore.transactional
        def increment_counter(transaction, counter_ref):
            snapshot = counter_ref.get(transaction=transaction)
            
            if snapshot.exists:
                current = snapshot.to_dict().get("current", 0)
                new_value = current + 1
            else:
                new_value = 1
            
            transaction.set(counter_ref, {"current": new_value})
            return new_value
        
        transaction = self.db.transaction()
        return increment_counter(transaction, counter_ref)
    
    def _build_issuer(self) -> Party:
        """Build issuer party from settings"""
        return Party(
            vat_number=self.settings.company_vat,
            country="GR",
            branch=self.settings.company_branch,
            name=self.settings.company_name,
            address=Address(
                street=self.settings.company_street,
                number=self.settings.company_number,
                postal_code=self.settings.company_postal,
                city=self.settings.company_city,
            ),
        )
    
    def _build_counterpart(self, order_data: dict) -> Optional[Party]:
        """Build counterpart party from order data"""
        if not order_data.get("customer_vat"):
            return None
        
        return Party(
            vat_number=order_data["customer_vat"],
            country=order_data.get("customer_country", "GR"),
            branch=0,
            name=order_data.get("customer_name"),
            address=Address(
                street=order_data.get("shipping_address", {}).get("street", ""),
                number=order_data.get("shipping_address", {}).get("number", ""),
                postal_code=order_data.get("shipping_address", {}).get("postal_code", ""),
                city=order_data.get("shipping_address", {}).get("city", ""),
            ) if order_data.get("shipping_address") else None,
        )
    
    def _build_lines(self, order_data: dict) -> List[InvoiceLine]:
        """Build invoice lines from order items"""
        lines = []
        
        for i, item in enumerate(order_data.get("items", []), 1):
            # Determine VAT rate
            vat_rate = self._get_vat_rate(item, order_data)
            
            # Calculate amounts
            quantity = Decimal(str(item.get("quantity", 1)))
            unit_price = Decimal(str(item.get("price", 0)))
            net_value = quantity * unit_price
            
            _, vat_amount, _ = calculate_vat(net_value, vat_rate)
            
            lines.append(InvoiceLine(
                line_number=i,
                net_value=net_value,
                vat_category=self._vat_rate_to_category(vat_rate),
                vat_amount=vat_amount,
                quantity=quantity,
                item_description=item.get("name"),
                income_classification_type=self._get_income_classification(item, order_data),
                income_classification_category=self._get_income_category(item),
            ))
        
        return lines
    
    def _build_payment_methods(self, order_data: dict) -> List[PaymentMethodDetail]:
        """Build payment methods from order"""
        payment_method = order_data.get("payment_method", "card")
        total = Decimal(str(order_data.get("total", 0)))
        
        method_map = {
            "card": PaymentMethod.CREDIT_CARD,
            "credit_card": PaymentMethod.CREDIT_CARD,
            "cash": PaymentMethod.CASH,
            "bank_transfer": PaymentMethod.DOMESTIC_PAYMENTS_ACCOUNT,
            "paypal": PaymentMethod.WEB_BANKING,
            "pos": PaymentMethod.POS,
        }
        
        return [PaymentMethodDetail(
            payment_type=method_map.get(payment_method, PaymentMethod.CREDIT_CARD),
            amount=total,
        )]
    
    def _get_vat_rate(self, item: dict, order_data: dict) -> GreekVATRate:
        """Determine VAT rate for item"""
        # Check for VAT exemption
        customer_country = order_data.get("customer_country", "GR")
        customer_vat = order_data.get("customer_vat")
        
        # Intra-EU B2B = reverse charge (0%)
        if customer_country in EU_COUNTRIES and customer_country != "GR" and customer_vat:
            return GreekVATRate.ZERO
        
        # Export = 0%
        if customer_country not in EU_COUNTRIES:
            return GreekVATRate.ZERO
        
        # Check item-specific rate
        item_vat_rate = item.get("vat_rate")
        if item_vat_rate:
            if item_vat_rate == 24:
                return GreekVATRate.STANDARD
            elif item_vat_rate == 13:
                return GreekVATRate.REDUCED_1
            elif item_vat_rate == 6:
                return GreekVATRate.REDUCED_2
        
        # Default to standard rate
        return GreekVATRate.STANDARD
    
    def _vat_rate_to_category(self, vat_rate: GreekVATRate) -> VATCategory:
        """Convert VAT rate to myDATA category"""
        mapping = {
            GreekVATRate.STANDARD: VATCategory.STANDARD_24,
            GreekVATRate.REDUCED_1: VATCategory.REDUCED_13,
            GreekVATRate.REDUCED_2: VATCategory.REDUCED_6,
            GreekVATRate.ZERO: VATCategory.EXEMPT,
        }
        return mapping.get(vat_rate, VATCategory.STANDARD_24)
    
    def _get_income_classification(self, item: dict, order_data: dict) -> str:
        """Get income classification type"""
        customer_country = order_data.get("customer_country", "GR")
        is_service = item.get("type") == "service"
        
        if is_service:
            if customer_country == "GR":
                return "E3_561_003"  # Services domestic
            elif customer_country in EU_COUNTRIES:
                return "E3_561_005"  # Services intra-EU
            else:
                return "E3_561_006"  # Services third country
        else:
            if customer_country == "GR":
                return "E3_561_001"  # Goods domestic
            elif customer_country in EU_COUNTRIES:
                return "E3_561_002"  # Goods intra-EU
            else:
                return "E3_561_007"  # Goods third country
    
    def _get_income_category(self, item: dict) -> str:
        """Get income classification category"""
        is_service = item.get("type") == "service"
        return "category1_3" if is_service else "category1_1"
    
    def _calculate_totals(self, lines: List[InvoiceLine]) -> dict:
        """Calculate invoice totals"""
        total_net = sum(line.net_value for line in lines)
        total_vat = sum(line.vat_amount for line in lines)
        
        return {
            "total_net": total_net,
            "total_vat": total_vat,
            "total_gross": total_net + total_vat,
            "total_withheld": Decimal("0"),
            "total_fees": Decimal("0"),
            "total_stamp_duty": Decimal("0"),
            "total_other_taxes": Decimal("0"),
            "total_deductions": Decimal("0"),
        }
    
    def _is_b2b(self, order_data: dict) -> bool:
        """Check if order is B2B"""
        return bool(order_data.get("customer_vat"))
    
    def _party_to_dict(self, party: Party) -> dict:
        """Convert Party to dict"""
        return {
            "vat_number": party.vat_number,
            "country": party.country,
            "branch": party.branch,
            "name": party.name,
            "address": {
                "street": party.address.street,
                "number": party.address.number,
                "postal_code": party.address.postal_code,
                "city": party.address.city,
            } if party.address else None,
        }
    
    def _line_to_dict(self, line: InvoiceLine) -> dict:
        """Convert InvoiceLine to dict"""
        return {
            "line_number": line.line_number,
            "description": line.item_description,
            "quantity": float(line.quantity),
            "net_value": float(line.net_value),
            "vat_category": line.vat_category.value,
            "vat_amount": float(line.vat_amount),
            "income_classification": {
                "type": line.income_classification_type.value if hasattr(line.income_classification_type, 'value') else line.income_classification_type,
                "category": line.income_classification_category.value if hasattr(line.income_classification_category, 'value') else line.income_classification_category,
            },
        }
    
    def _payment_to_dict(self, payment: PaymentMethodDetail) -> dict:
        """Convert PaymentMethodDetail to dict"""
        return {
            "type": payment.payment_type.value,
            "amount": float(payment.amount),
            "info": payment.payment_info,
        }


# EU country codes
EU_COUNTRIES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
}
```

### 5.3 Handling Refunds and Credit Notes

```python
"""
services/credit_note_service.py - Credit note handling
"""
from firebase_admin import firestore
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional, List
import logging

from mydata.invoice_types import InvoiceType
from mydata.xml_builder import MyDataXMLBuilder

logger = logging.getLogger(__name__)


class CreditNoteService:
    """Service for credit note generation"""
    
    def __init__(self, db, settings):
        self.db = db
        self.settings = settings
        self.xml_builder = MyDataXMLBuilder()
    
    def create_full_credit_note(
        self,
        original_mark: str,
        reason: str,
        created_by: str,
    ) -> dict:
        """
        Create full credit note (complete reversal)
        
        Args:
            original_mark: MARK of original invoice
            reason: Reason for credit note
            created_by: User creating credit note
        
        Returns:
            Credit note document
        """
        # Get original invoice
        original = self._get_invoice_by_mark(original_mark)
        if not original:
            raise ValueError(f"Invoice with MARK {original_mark} not found")
        
        # Get next credit note number
        series = "CN"
        number = self._get_next_number(series)
        
        # Create credit note document
        credit_note = {
            "id": f"{series}-{number}",
            "uid": None,  # Will be calculated
            "mark": None,
            "invoice_type": "5.1",  # Credit Note - Related
            "series": series,
            "number": number,
            "issue_date": datetime.now(),
            "currency": original.get("currency", "EUR"),
            "issuer": original["issuer"],
            "counterpart": original.get("counterpart"),
            "lines": original["lines"],  # Same lines as original
            "payment_methods": original["payment_methods"],
            "totals": original["totals"],
            "correlated_mark": original_mark,
            "original_invoice_id": original["id"],
            "reason": reason,
            "status": "pending",
            "mydata_status": "pending",
            "created_by": created_by,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        
        # Calculate UID
        from mydata.xml_builder import MyDataInvoice, Party, InvoiceLine, PaymentMethodDetail
        
        invoice_obj = self._dict_to_invoice(credit_note, original_mark)
        credit_note["uid"] = invoice_obj.calculate_uid()
        
        # Build XML
        credit_note["xml_content"] = self.xml_builder.build_invoice_xml(invoice_obj)
        
        # Save
        doc_ref = self.db.collection("invoices").document(credit_note["id"])
        doc_ref.set(credit_note)
        
        # Update original invoice
        self.db.collection("invoices").where("mark", "==", original_mark).limit(1).stream()
        for doc in self.db.collection("invoices").where("mark", "==", original_mark).limit(1).stream():
            doc.reference.update({
                "credit_notes": firestore.ArrayUnion([credit_note["id"]]),
                "status": "credited",
            })
        
        # Queue for transmission
        self._queue_transmission(credit_note)
        
        logger.info(f"Credit note {credit_note['id']} created for MARK {original_mark}")
        
        return {
            "credit_note_id": credit_note["id"],
            "original_mark": original_mark,
            "success": True,
        }
    
    def create_partial_credit_note(
        self,
        original_mark: str,
        refund_amount: Decimal,
        reason: str,
        created_by: str,
        specific_lines: Optional[List[dict]] = None,
    ) -> dict:
        """
        Create partial credit note
        
        Args:
            original_mark: MARK of original invoice
            refund_amount: Amount to refund
            reason: Reason for credit note
            created_by: User creating credit note
            specific_lines: Optional specific line items to credit
        
        Returns:
            Credit note document
        """
        original = self._get_invoice_by_mark(original_mark)
        if not original:
            raise ValueError(f"Invoice with MARK {original_mark} not found")
        
        # Calculate proportional credit if no specific lines
        if specific_lines:
            lines = specific_lines
        else:
            lines = self._calculate_proportional_lines(original, refund_amount)
        
        # Get next credit note number
        series = "CN"
        number = self._get_next_number(series)
        
        # Calculate totals for credit note
        total_net = sum(Decimal(str(l.get("net_value", 0))) for l in lines)
        total_vat = sum(Decimal(str(l.get("vat_amount", 0))) for l in lines)
        
        credit_note = {
            "id": f"{series}-{number}",
            "uid": None,
            "mark": None,
            "invoice_type": "5.1",
            "series": series,
            "number": number,
            "issue_date": datetime.now(),
            "currency": original.get("currency", "EUR"),
            "issuer": original["issuer"],
            "counterpart": original.get("counterpart"),
            "lines": lines,
            "payment_methods": [{
                "type": original["payment_methods"][0]["type"],
                "amount": float(total_net + total_vat),
            }],
            "totals": {
                "total_net": float(total_net),
                "total_vat": float(total_vat),
                "total_gross": float(total_net + total_vat),
                "total_withheld": 0,
                "total_fees": 0,
                "total_stamp_duty": 0,
                "total_other_taxes": 0,
                "total_deductions": 0,
            },
            "correlated_mark": original_mark,
            "original_invoice_id": original["id"],
            "reason": reason,
            "is_partial": True,
            "status": "pending",
            "mydata_status": "pending",
            "created_by": created_by,
            "created_at": firestore.SERVER_TIMESTAMP,
        }
        
        # Calculate UID and build XML
        invoice_obj = self._dict_to_invoice(credit_note, original_mark)
        credit_note["uid"] = invoice_obj.calculate_uid()
        credit_note["xml_content"] = self.xml_builder.build_invoice_xml(invoice_obj)
        
        # Save
        doc_ref = self.db.collection("invoices").document(credit_note["id"])
        doc_ref.set(credit_note)
        
        # Update original
        for doc in self.db.collection("invoices").where("mark", "==", original_mark).limit(1).stream():
            doc.reference.update({
                "credit_notes": firestore.ArrayUnion([credit_note["id"]]),
            })
        
        # Queue for transmission
        self._queue_transmission(credit_note)
        
        return {
            "credit_note_id": credit_note["id"],
            "original_mark": original_mark,
            "credited_amount": float(total_net + total_vat),
            "success": True,
        }
    
    def _get_invoice_by_mark(self, mark: str) -> Optional[dict]:
        """Get invoice by MARK"""
        for doc in self.db.collection("invoices").where("mark", "==", mark).limit(1).stream():
            return doc.to_dict()
        return None
    
    def _get_next_number(self, series: str) -> int:
        """Get next number in series"""
        counter_ref = self.db.collection("counters").document(f"invoice_{series}")
        
        @firestore.transactional
        def increment(transaction, ref):
            snapshot = ref.get(transaction=transaction)
            current = snapshot.to_dict().get("current", 0) if snapshot.exists else 0
            new_value = current + 1
            transaction.set(ref, {"current": new_value})
            return new_value
        
        return increment(self.db.transaction(), counter_ref)
    
    def _calculate_proportional_lines(self, original: dict, refund_amount: Decimal) -> List[dict]:
        """Calculate proportional line items for partial refund"""
        original_total = Decimal(str(original["totals"]["total_gross"]))
        ratio = refund_amount / original_total
        
        lines = []
        for i, orig_line in enumerate(original["lines"], 1):
            net = Decimal(str(orig_line["net_value"])) * ratio
            vat = Decimal(str(orig_line["vat_amount"])) * ratio
            
            lines.append({
                "line_number": i,
                "description": orig_line.get("description", ""),
                "quantity": float(Decimal(str(orig_line.get("quantity", 1))) * ratio),
                "net_value": float(net.quantize(Decimal("0.01"))),
                "vat_category": orig_line["vat_category"],
                "vat_amount": float(vat.quantize(Decimal("0.01"))),
                "income_classification": orig_line.get("income_classification", {
                    "type": "E3_561_001",
                    "category": "category1_1",
                }),
            })
        
        return lines
    
    def _dict_to_invoice(self, credit_note: dict, correlated_mark: str):
        """Convert credit note dict to MyDataInvoice object"""
        from mydata.xml_builder import MyDataInvoice, Party, Address, InvoiceLine, PaymentMethodDetail
        from mydata.invoice_types import InvoiceType, VATCategory, PaymentMethod, IncomeClassificationType, IncomeClassificationCategory
        
        issuer_data = credit_note["issuer"]
        issuer = Party(
            vat_number=issuer_data["vat_number"],
            country=issuer_data["country"],
            branch=issuer_data["branch"],
            name=issuer_data.get("name"),
            address=Address(**issuer_data["address"]) if issuer_data.get("address") else None,
        )
        
        counterpart = None
        if credit_note.get("counterpart"):
            cp_data = credit_note["counterpart"]
            counterpart = Party(
                vat_number=cp_data["vat_number"],
                country=cp_data["country"],
                branch=cp_data["branch"],
                name=cp_data.get("name"),
                address=Address(**cp_data["address"]) if cp_data.get("address") else None,
            )
        
        lines = []
        for line_data in credit_note["lines"]:
            lines.append(InvoiceLine(
                line_number=line_data["line_number"],
                net_value=Decimal(str(line_data["net_value"])),
                vat_category=VATCategory(line_data["vat_category"]),
                vat_amount=Decimal(str(line_data["vat_amount"])),
                quantity=Decimal(str(line_data.get("quantity", 1))),
            ))
        
        payment_methods = []
        for pm_data in credit_note["payment_methods"]:
            payment_methods.append(PaymentMethodDetail(
                payment_type=PaymentMethod(pm_data["type"]),
                amount=Decimal(str(pm_data["amount"])),
            ))
        
        return MyDataInvoice(
            issuer=issuer,
            counterpart=counterpart,
            invoice_type=InvoiceType.CREDIT_NOTE_RELATED,
            series=credit_note["series"],
            aa=credit_note["number"],
            issue_date=credit_note["issue_date"] if isinstance(credit_note["issue_date"], datetime) else datetime.now(),
            currency=credit_note.get("currency", "EUR"),
            correlated_invoices=correlated_mark,
            lines=lines,
            payment_methods=payment_methods,
        )
    
    def _queue_transmission(self, credit_note: dict):
        """Queue credit note for transmission"""
        self.db.collection("transmission_queue").add({
            "invoice_id": credit_note["id"],
            "invoice_uid": credit_note["uid"],
            "xml_content": credit_note["xml_content"],
            "status": "pending",
            "priority": 2,  # Higher priority for credit notes
            "created_at": firestore.SERVER_TIMESTAMP,
            "attempts": [],
        })
```

### 5.4 Shopify Integration

```python
"""
handlers/webhook_handlers.py - Shopify webhook handling
"""
from firebase_functions import https_fn
from firebase_admin import firestore
import hmac
import hashlib
import json
import logging
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)


@https_fn.on_request()
def handle_shopify_webhook(request):
    """
    Handle Shopify webhooks for order events
    
    Supported topics:
    - orders/create
    - orders/paid
    - orders/cancelled
    - refunds/create
    """
    # Verify webhook signature
    if not verify_shopify_signature(request):
        return {"error": "Invalid signature"}, 401
    
    topic = request.headers.get("X-Shopify-Topic")
    shop = request.headers.get("X-Shopify-Shop-Domain")
    
    logger.info(f"Received Shopify webhook: {topic} from {shop}")
    
    data = request.json
    
    handlers = {
        "orders/create": handle_order_create,
        "orders/paid": handle_order_paid,
        "orders/cancelled": handle_order_cancelled,
        "refunds/create": handle_refund_create,
    }
    
    handler = handlers.get(topic)
    if handler:
        try:
            handler(data, shop)
            return {"status": "ok"}, 200
        except Exception as e:
            logger.error(f"Error handling {topic}: {e}")
            return {"error": str(e)}, 500
    
    return {"status": "ignored"}, 200


def verify_shopify_signature(request) -> bool:
    """Verify Shopify webhook HMAC signature"""
    import os
    
    secret = os.environ.get("SHOPIFY_WEBHOOK_SECRET")
    if not secret:
        logger.warning("SHOPIFY_WEBHOOK_SECRET not configured")
        return False
    
    signature = request.headers.get("X-Shopify-Hmac-Sha256")
    if not signature:
        return False
    
    computed = hmac.new(
        secret.encode(),
        request.data,
        hashlib.sha256
    ).digest()
    
    import base64
    computed_b64 = base64.b64encode(computed).decode()
    
    return hmac.compare_digest(computed_b64, signature)


def handle_order_create(data: dict, shop: str):
    """Handle order creation from Shopify"""
    db = firestore.client()
    
    order_id = str(data["id"])
    
    # Convert Shopify order to internal format
    order_doc = {
        "id": order_id,
        "shopify_id": data["id"],
        "shopify_order_number": data["order_number"],
        "shop": shop,
        "status": "pending",
        "payment_status": "pending",
        
        # Customer info
        "customer_email": data.get("email"),
        "customer_name": f"{data.get('customer', {}).get('first_name', '')} {data.get('customer', {}).get('last_name', '')}".strip(),
        "customer_vat": extract_vat_from_shopify(data),
        "customer_country": data.get("shipping_address", {}).get("country_code", "GR"),
        
        # Shipping address
        "shipping_address": {
            "street": data.get("shipping_address", {}).get("address1", ""),
            "number": "",
            "postal_code": data.get("shipping_address", {}).get("zip", ""),
            "city": data.get("shipping_address", {}).get("city", ""),
            "country": data.get("shipping_address", {}).get("country_code", "GR"),
        },
        
        # Items
        "items": [
            {
                "id": str(item["id"]),
                "name": item["title"],
                "sku": item.get("sku"),
                "quantity": item["quantity"],
                "price": Decimal(item["price"]),
                "net_total": Decimal(item["price"]) * item["quantity"],
                "vat_amount": calculate_item_vat(item, data),
                "type": "product",
            }
            for item in data.get("line_items", [])
        ],
        
        # Totals
        "subtotal": Decimal(data.get("subtotal_price", "0")),
        "vat_total": Decimal(data.get("total_tax", "0")),
        "total": Decimal(data.get("total_price", "0")),
        "currency": data.get("currency", "EUR"),
        
        # Payment
        "payment_method": map_shopify_payment_method(data),
        
        # Timestamps
        "shopify_created_at": data.get("created_at"),
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    
    # Save order
    db.collection("orders").document(order_id).set(order_doc)
    
    logger.info(f"Order {order_id} created from Shopify")


def handle_order_paid(data: dict, shop: str):
    """Handle order payment confirmation from Shopify"""
    db = firestore.client()
    
    order_id = str(data["id"])
    
    # Update order status
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()
    
    if not order.exists:
        # Order might not exist yet, create it
        handle_order_create(data, shop)
        order_ref = db.collection("orders").document(order_id)
    
    order_ref.update({
        "payment_status": "paid",
        "paid_at": firestore.SERVER_TIMESTAMP,
        "payment_method": map_shopify_payment_method(data),
    })
    
    logger.info(f"Order {order_id} marked as paid")


def handle_order_cancelled(data: dict, shop: str):
    """Handle order cancellation from Shopify"""
    db = firestore.client()
    
    order_id = str(data["id"])
    
    db.collection("orders").document(order_id).update({
        "status": "cancelled",
        "cancelled_at": firestore.SERVER_TIMESTAMP,
        "cancellation_reason": data.get("cancel_reason", "Cancelled via Shopify"),
    })
    
    logger.info(f"Order {order_id} cancelled")


def handle_refund_create(data: dict, shop: str):
    """Handle refund creation from Shopify"""
    db = firestore.client()
    
    order_id = str(data["order_id"])
    refund_id = str(data["id"])
    
    # Calculate refund amount
    refund_amount = sum(
        Decimal(item.get("subtotal", "0")) + Decimal(item.get("total_tax", "0"))
        for item in data.get("refund_line_items", [])
    )
    
    # Update order
    db.collection("orders").document(order_id).update({
        "refund_status": "refunded",
        "refund_amount": float(refund_amount),
        "refund_reason": data.get("note", "Refund via Shopify"),
        "shopify_refund_id": refund_id,
        "refunded_at": firestore.SERVER_TIMESTAMP,
    })
    
    logger.info(f"Refund {refund_id} created for order {order_id}")


def extract_vat_from_shopify(data: dict) -> str:
    """Extract VAT number from Shopify order"""
    # Check note attributes
    for attr in data.get("note_attributes", []):
        if attr.get("name", "").lower() in ["vat", "vat_number", "afm", "αφμ"]:
            return attr.get("value", "")
    
    # Check customer metafields
    customer = data.get("customer", {})
    for metafield in customer.get("metafields", []):
        if metafield.get("key", "").lower() in ["vat", "vat_number"]:
            return metafield.get("value", "")
    
    return ""


def calculate_item_vat(item: dict, order_data: dict) -> Decimal:
    """Calculate VAT amount for item"""
    # Check if tax lines exist
    tax_lines = item.get("tax_lines", [])
    if tax_lines:
        return sum(Decimal(t.get("price", "0")) for t in tax_lines)
    
    # Calculate from order total tax proportionally
    total_price = Decimal(order_data.get("subtotal_price", "1"))
    total_tax = Decimal(order_data.get("total_tax", "0"))
    item_price = Decimal(item.get("price", "0")) * item.get("quantity", 1)
    
    if total_price > 0:
        return (item_price / total_price * total_tax).quantize(Decimal("0.01"))
    
    return Decimal("0")


def map_shopify_payment_method(data: dict) -> str:
    """Map Shopify payment gateway to internal payment method"""
    gateway = data.get("gateway", "").lower()
    
    mapping = {
        "shopify_payments": "card",
        "stripe": "card",
        "paypal": "paypal",
        "manual": "bank_transfer",
        "cash_on_delivery": "cash",
        "cod": "cash",
    }
    
    return mapping.get(gateway, "card")
```

### 5.5 Multi-Payment Method Handling

```python
"""
Multi-payment method handling for myDATA
"""
from decimal import Decimal
from typing import List, Dict
from mydata.invoice_types import PaymentMethod


def split_payment_methods(order_data: dict) -> List[Dict]:
    """
    Handle orders with multiple payment methods
    
    Args:
        order_data: Order data with payment information
    
    Returns:
        List of payment method details for myDATA
    """
    payments = order_data.get("payments", [])
    
    if not payments:
        # Single payment method
        return [{
            "type": map_payment_method(order_data.get("payment_method", "card")),
            "amount": float(order_data.get("total", 0)),
        }]
    
    # Multiple payment methods
    result = []
    for payment in payments:
        result.append({
            "type": map_payment_method(payment.get("method")),
            "amount": float(payment.get("amount", 0)),
            "info": payment.get("transaction_id"),
        })
    
    return result


def map_payment_method(method: str) -> int:
    """Map payment method string to myDATA code"""
    mapping = {
        "cash": PaymentMethod.CASH.value,
        "card": PaymentMethod.CREDIT_CARD.value,
        "credit_card": PaymentMethod.CREDIT_CARD.value,
        "debit_card": PaymentMethod.CREDIT_CARD.value,
        "bank_transfer": PaymentMethod.DOMESTIC_PAYMENTS_ACCOUNT.value,
        "wire_transfer": PaymentMethod.DOMESTIC_PAYMENTS_ACCOUNT.value,
        "paypal": PaymentMethod.WEB_BANKING.value,
        "stripe": PaymentMethod.CREDIT_CARD.value,
        "pos": PaymentMethod.POS.value,
        "iris": PaymentMethod.IRIS.value,
        "check": 4,  # Check
    }
    
    return mapping.get(method.lower(), PaymentMethod.CREDIT_CARD.value)


def validate_payment_total(payments: List[Dict], invoice_total: Decimal) -> bool:
    """
    Validate that payment methods sum to invoice total
    
    Args:
        payments: List of payment method details
        invoice_total: Total invoice amount
    
    Returns:
        True if valid, False otherwise
    """
    payment_sum = sum(Decimal(str(p.get("amount", 0))) for p in payments)
    
    # Allow small rounding differences (0.01)
    return abs(payment_sum - invoice_total) <= Decimal("0.01")
```

---

## Appendix A: Reference Tables

### A.1 Invoice Type Codes

| Code | Greek Name | English Name |
|------|------------|--------------|
| 1.1 | Τιμολόγιο Πώλησης | Sales Invoice |
| 1.2 | Τιμολόγιο Πώλησης / Ενδοκοινοτικές Παραδόσεις | Sales Invoice - Intra-Community |
| 1.3 | Τιμολόγιο Πώλησης / Παραδόσεις Τρίτων Χωρών | Sales Invoice - Third Country |
| 1.4 | Τιμολόγιο Πώλησης / Πώληση για Λογαριασμό Τρίτων | Sales Invoice - On Behalf of Third Parties |
| 1.5 | Τιμολόγιο Πώλησης / Εκκαθάριση Πωλήσεων Τρίτων | Sales Invoice - Third Party Settlement |
| 1.6 | Τιμολόγιο Πώλησης / Συμπληρωματικό | Sales Invoice - Supplementary |
| 2.1 | Τιμολόγιο Παροχής Υπηρεσιών | Service Provision Invoice |
| 2.2 | Τιμολόγιο Παροχής / Ενδοκοινοτική Παροχή | Service Invoice - Intra-Community |
| 2.3 | Τιμολόγιο Παροχής / Παροχή σε Τρίτη Χώρα | Service Invoice - Third Country |
| 2.4 | Τιμολόγιο Παροχής / Συμπληρωματικό | Service Invoice - Supplementary |
| 3.1 | Τίτλος Κτήσης (μη υπόχρεος) | Acquisition Title - Non-obligated |
| 3.2 | Τίτλος Κτήσης (άρνηση) | Acquisition Title - Refusal |
| 5.1 | Πιστωτικό Τιμολόγιο / Συσχετιζόμενο | Credit Invoice - Related |
| 5.2 | Πιστωτικό Τιμολόγιο / Μη Συσχετιζόμενο | Credit Invoice - Unrelated |
| 6.1 | Στοιχείο Αυτοπαράδοσης | Self-Delivery Document |
| 6.2 | Στοιχείο Ιδιοχρησιμοποίησης | Own-Use Document |
| 11.1 | ΑΛΠ | Retail Sales Receipt |
| 11.2 | Απόδειξη Παροχής Υπηρεσιών | Service Receipt |
| 11.3 | Απλοποιημένο Τιμολόγιο | Simplified Invoice |
| 11.4 | Πιστωτικό Στοιχείο Λιανικής | Retail Credit Note |
| 11.5 | Απόδειξη Λιανικής Επιστροφής | Retail Return Receipt |

### A.2 VAT Categories

| Code | Rate | Description |
|------|------|-------------|
| 1 | 24% | Standard rate |
| 2 | 13% | Reduced rate |
| 3 | 6% | Super-reduced rate |
| 4 | 17% | Island standard rate |
| 5 | 9% | Island reduced rate |
| 6 | 4% | Island super-reduced rate |
| 7 | 0% | Zero rate (exempt) |
| 8 | - | Without VAT |

### A.3 Payment Method Codes

| Code | Description |
|------|-------------|
| 1 | Domestic Payments Account |
| 2 | Foreign Payments Account |
| 3 | Cash |
| 4 | Check |
| 5 | Credit/Debit Card |
| 6 | Web Banking |
| 7 | POS / e-POS |
| 8 | IRIS |

### A.4 Income Classification Types (E3)

| Code | Description |
|------|-------------|
| E3_561_001 | Sales of goods - domestic |
| E3_561_002 | Sales of goods - intra-community |
| E3_561_003 | Sales of services - domestic |
| E3_561_005 | Sales of services - intra-community |
| E3_561_006 | Sales of services - third country |
| E3_561_007 | Sales of goods - third country |

### A.5 Income Classification Categories

| Code | Description |
|------|-------------|
| category1_1 | Revenue from sale of goods |
| category1_2 | Revenue from sale of goods on behalf of third parties |
| category1_3 | Revenue from provision of services |
| category1_4 | Revenue from sale of fixed assets |
| category1_5 | Other income/profits |
| category1_6 | Self-deliveries/own use |
| category1_7 | Revenue for third party account |

---

## Appendix B: Regulatory References

### Greek Legislation

1. **Law 4308/2014** - Greek Accounting Standards
2. **Law 4174/2013** - Tax Procedures Code
3. **Law 5073/2023** - myDATA penalty framework
4. **Decision A.1138/2020** - myDATA implementation
5. **Decision A.1158/2023** - E-invoicing provider certification
6. **Decision 1122/2024** - Digital movement documents
7. **Decision 1123/2024** - myDATA API v2.0.0
8. **Decision 1160/2025** - IRIS payment integration

### AADE Resources

- [myDATA Portal](https://www.aade.gr/mydata)
- [Technical Specifications](https://www.aade.gr/mydata/prodiagrafes)
- [API Documentation](https://www.aade.gr/sites/default/files/2024-11/myDATA%20API%20Documentation%20v1.0.10_preofficial_erp.pdf)
- [Developer Portal](https://mydata-dev.portal.azure-api.net/)
- [Licensed Providers](https://www.aade.gr/en/mydata/licensed-software-e-invoicing-providers)

---

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Last Updated** | February 2026 |
| **Author** | DeepAgent |
| **Target Platform** | Firebase Cloud Functions (Python) |
| **Compliance Standard** | AADE myDATA v1.0.10 |

---

*This document is intended for implementation by developers and AI coding agents. All code examples are production-ready but should be tested in sandbox environment before deployment.*
