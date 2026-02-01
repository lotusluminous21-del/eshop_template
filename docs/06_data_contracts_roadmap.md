# 06: Core Data Contracts & Implementation Roadmap

> **Related Documents:** [01_system_architecture.md](./01_system_architecture.md), [04_aade_mydata_compliance.md](./04_aade_mydata_compliance.md), [05_payments_seo_infrastructure.md](./05_payments_seo_infrastructure.md)

---

## Table of Contents

1. [Fixed Schemas (Regulatory/Integration-Driven)](#section-1-fixed-schemas)
2. [Extension Patterns (Flexible)](#section-2-extension-patterns)
3. [Guidelines & Conventions](#section-3-guidelines--conventions)
4. [Implementation Roadmap](#section-4-implementation-roadmap)

---

## Section 1: Fixed Schemas

These schemas are **non-negotiable** due to external system requirements (AADE myDATA, Shopify, payment providers).

### AADE Invoice Structure

The invoice structure must conform to myDATA XML specification. See [04_aade_mydata_compliance.md](./04_aade_mydata_compliance.md) for full details.

```typescript
// types/aade/invoice.ts
import { z } from 'zod';

/**
 * AADE Invoice - Mandatory fields per myDATA specification
 * These fields CANNOT be modified without breaking compliance
 */
export const AADEInvoiceSchema = z.object({
  // === Issuer (Εκδότης) - Your business ===
  issuer: z.object({
    vatNumber: z.string().length(9),           // ΑΦΜ - exactly 9 digits
    country: z.literal('GR'),                   // Always GR for Greek businesses
    branch: z.number().int().default(0),        // Branch code, 0 = headquarters
  }),

  // === Counterparty (Λήπτης) - Customer ===
  counterparty: z.object({
    vatNumber: z.string().optional(),           // Required for B2B, optional for B2C
    country: z.string().length(2),              // ISO 3166-1 alpha-2
    branch: z.number().int().default(0),
    name: z.string().optional(),                // Required if no VAT
    address: z.object({
      street: z.string().optional(),
      number: z.string().optional(),
      postalCode: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
  }).optional(),  // Optional for retail receipts

  // === Invoice Header ===
  invoiceHeader: z.object({
    series: z.string().max(50),                 // Invoice series (e.g., "A")
    aa: z.string(),                             // Sequential number
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    invoiceType: z.string(),                    // See InvoiceTypeEnum
    currency: z.string().length(3).default('EUR'),
    exchangeRate: z.number().optional(),        // Required if not EUR
  }),

  // === Payment Methods ===
  paymentMethods: z.array(z.object({
    type: z.number().int(),                     // 1=Cash, 3=Card, 5=Bank transfer, etc.
    amount: z.number(),
    paymentMethodInfo: z.string().optional(),
  })),

  // === Invoice Details (Line Items) ===
  invoiceDetails: z.array(z.object({
    lineNumber: z.number().int(),
    netValue: z.number(),                       // Net amount (before VAT)
    vatCategory: z.number().int(),              // 1=24%, 2=13%, 3=6%, etc.
    vatAmount: z.number(),
    // Income classification (mandatory)
    incomeClassification: z.array(z.object({
      classificationType: z.string(),           // E3_561_001, E3_561_002, etc.
      classificationCategory: z.string(),       // category1_1, category1_2, etc.
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
    totalGrossValue: z.number(),                // Final amount
  }),
});

export type AADEInvoice = z.infer<typeof AADEInvoiceSchema>;

/**
 * Invoice Types (Τύποι Παραστατικών)
 * These codes are defined by AADE and cannot be changed
 */
export const InvoiceTypeEnum = {
  // Sales Invoices
  SALES_INVOICE: '1.1',           // Τιμολόγιο Πώλησης
  SALES_INVOICE_INTRA_EU: '1.2',  // Τιμολόγιο Πώλησης / Ενδοκοινοτικές
  SALES_INVOICE_THIRD: '1.3',     // Τιμολόγιο Πώλησης / Τρίτες Χώρες
  SERVICE_INVOICE: '2.1',         // Τιμολόγιο Παροχής Υπηρεσιών
  
  // Retail
  RETAIL_RECEIPT: '11.1',         // ΑΛΠ (Απόδειξη Λιανικής Πώλησης)
  RETAIL_SERVICE: '11.2',         // ΑΠΥ (Απόδειξη Παροχής Υπηρεσιών)
  
  // Credit Notes
  CREDIT_INVOICE: '5.1',          // Πιστωτικό Τιμολόγιο
  CREDIT_RETAIL: '11.4',          // Πιστωτικό Στοιχείο Λιανικής
} as const;

/**
 * VAT Categories
 */
export const VATCategoryEnum = {
  STANDARD_24: 1,      // 24% - Standard rate
  REDUCED_13: 2,       // 13% - Reduced rate (food, hotels)
  SUPER_REDUCED_6: 3,  // 6% - Super reduced (medicines, books)
  EXEMPT: 7,           // 0% - Exempt
  NO_VAT: 8,           // No VAT (outside scope)
} as const;

/**
 * Payment Method Types
 */
export const PaymentMethodEnum = {
  CASH: 1,
  CHEQUE: 2,
  CARD: 3,
  CREDIT: 4,
  BANK_TRANSFER: 5,
  DIGITAL_WALLET: 6,
  DIGITAL_CURRENCY: 7,
} as const;
```

### Order ↔ Shopify Mapping

```typescript
// types/order.ts
import { z } from 'zod';

/**
 * Order schema with mandatory Shopify alignment
 * Fields marked with shopify_* MUST match Shopify's structure
 */
export const OrderSchema = z.object({
  // === Internal Identifiers ===
  id: z.string(),                              // Firestore document ID
  orderNumber: z.string(),                     // Human-readable order number
  
  // === Shopify Alignment (Required for sync) ===
  shopify_order_id: z.string().optional(),     // Shopify's order GID
  shopify_checkout_id: z.string().optional(),  // Shopify checkout token
  shopify_order_number: z.number().optional(), // Shopify's order number
  
  // === Customer ===
  customer: z.object({
    id: z.string().optional(),
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    // AADE compliance fields
    vatNumber: z.string().optional(),          // ΑΦΜ for B2B
    companyName: z.string().optional(),
    profession: z.string().optional(),         // Required for some invoice types
  }),
  
  // === Addresses (Shopify-aligned structure) ===
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    province: z.string().optional(),           // Region/State
    provinceCode: z.string().optional(),
    country: z.string(),
    countryCode: z.string().length(2),         // ISO 3166-1 alpha-2
    zip: z.string(),
    phone: z.string().optional(),
  }),
  
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    address1: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    province: z.string().optional(),
    provinceCode: z.string().optional(),
    country: z.string(),
    countryCode: z.string().length(2),
    zip: z.string(),
    phone: z.string().optional(),
  }),
  
  // === Line Items (Shopify-aligned) ===
  lineItems: z.array(z.object({
    id: z.string(),
    variantId: z.string(),
    productId: z.string(),
    title: z.string(),
    variantTitle: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number(),                         // Unit price
    totalPrice: z.number(),                    // quantity * price
    taxable: z.boolean().default(true),
    // Shopify sync
    shopify_line_item_id: z.string().optional(),
  })),
  
  // === Pricing (Shopify-aligned) ===
  subtotalPrice: z.number(),                   // Before tax/shipping
  totalTax: z.number(),
  totalShipping: z.number(),
  totalDiscounts: z.number().default(0),
  totalPrice: z.number(),                      // Final amount
  currency: z.string().length(3).default('EUR'),
  
  // === Status ===
  financialStatus: z.enum([
    'pending',
    'authorized',
    'partially_paid',
    'paid',
    'partially_refunded',
    'refunded',
    'voided'
  ]),
  fulfillmentStatus: z.enum([
    'unfulfilled',
    'partially_fulfilled',
    'fulfilled',
    'restocked'
  ]).nullable(),
  
  // === Payment Tracking ===
  payment: z.object({
    provider: z.enum(['viva_wallet', 'stripe', 'everypay']),
    status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'refunded']),
    transactionId: z.string().optional(),
    confirmedAt: z.date().optional(),
    error: z.string().optional(),
  }),
  
  // === AADE Tracking ===
  aade: z.object({
    mark: z.string().optional(),               // ΜΑΡΚ from AADE
    uid: z.string().optional(),                // Unique ID from AADE
    invoiceType: z.string().optional(),
    transmittedAt: z.date().optional(),
    error: z.string().optional(),
    retryCount: z.number().int().default(0),
  }).optional(),
  
  // === Timestamps ===
  createdAt: z.date(),
  updatedAt: z.date(),
  processedAt: z.date().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
```

### Customer Data for AADE Compliance

```typescript
// types/customer.ts
import { z } from 'zod';

/**
 * Customer schema with AADE counterparty requirements
 */
export const CustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  
  // Basic info
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  
  // === AADE Counterparty Fields ===
  // Required for B2B invoices
  vatNumber: z.string().regex(/^\d{9}$/).optional(),  // Greek ΑΦΜ
  vatCountry: z.string().length(2).default('GR'),
  companyName: z.string().optional(),
  profession: z.string().optional(),                   // Επάγγελμα
  taxOffice: z.string().optional(),                    // ΔΟΥ
  
  // Address (AADE format)
  address: z.object({
    street: z.string(),                                // Οδός
    number: z.string(),                                // Αριθμός
    postalCode: z.string().regex(/^\d{5}$/),          // ΤΚ (5 digits)
    city: z.string(),                                  // Πόλη
    country: z.string().length(2).default('GR'),
  }).optional(),
  
  // Customer type
  customerType: z.enum(['individual', 'business']).default('individual'),
  
  // Shopify sync
  shopify_customer_id: z.string().optional(),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Customer = z.infer<typeof CustomerSchema>;
```

### Payment Audit Trail

```typescript
// types/payment-audit.ts
import { z } from 'zod';

/**
 * Payment audit trail - Links order → payment → invoice
 * Required for financial reconciliation and AADE compliance
 */
export const PaymentAuditSchema = z.object({
  id: z.string(),
  
  // === Linkage (Non-negotiable) ===
  orderId: z.string(),
  orderNumber: z.string(),
  
  // === Payment Details ===
  provider: z.enum(['viva_wallet', 'stripe', 'everypay']),
  transactionId: z.string(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'digital_wallet']),
  
  // === Amounts ===
  amount: z.number(),
  currency: z.string().length(3),
  refundedAmount: z.number().default(0),
  
  // === Status History ===
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded']),
  statusHistory: z.array(z.object({
    status: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.unknown()).optional(),
  })),
  
  // === AADE Linkage ===
  aadeMark: z.string().optional(),
  aadeUid: z.string().optional(),
  invoiceTransmittedAt: z.date().optional(),
  
  // === Timestamps ===
  createdAt: z.date(),
  updatedAt: z.date(),
  confirmedAt: z.date().optional(),
});

export type PaymentAudit = z.infer<typeof PaymentAuditSchema>;
```

### Cart ↔ Shopify Cart API Alignment

```typescript
// types/cart.ts
import { z } from 'zod';

/**
 * Cart schema aligned with Shopify Storefront Cart API
 * Structure must match for seamless sync
 */
export const CartLineSchema = z.object({
  id: z.string(),                              // Shopify cart line ID
  quantity: z.number().int().positive(),
  
  merchandise: z.object({
    id: z.string(),                            // Variant GID
    title: z.string(),
    product: z.object({
      id: z.string(),
      title: z.string(),
      handle: z.string(),
      featuredImage: z.object({
        url: z.string().url(),
        altText: z.string().nullable(),
      }).nullable(),
    }),
    price: z.object({
      amount: z.string(),                      // Shopify returns as string
      currencyCode: z.string(),
    }),
    selectedOptions: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })),
    availableForSale: z.boolean(),
  }),
  
  cost: z.object({
    totalAmount: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
    amountPerQuantity: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
  }),
});

export const CartSchema = z.object({
  id: z.string(),                              // Shopify cart ID
  checkoutUrl: z.string().url(),
  
  lines: z.object({
    edges: z.array(z.object({
      node: CartLineSchema,
    })),
  }),
  
  cost: z.object({
    subtotalAmount: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
    totalAmount: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
    totalTaxAmount: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }).nullable(),
  }),
  
  totalQuantity: z.number().int(),
});

export type Cart = z.infer<typeof CartSchema>;
export type CartLine = z.infer<typeof CartLineSchema>;
```

---

## Section 2: Extension Patterns

These patterns provide **flexibility** for different business types while maintaining type safety.

### Product Entity Extensions

```typescript
// types/product-extensions.ts
import { z } from 'zod';

/**
 * Base product schema (from Shopify)
 */
const BaseProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  description: z.string(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()),
  priceRange: z.object({
    minVariantPrice: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
    maxVariantPrice: z.object({
      amount: z.string(),
      currencyCode: z.string(),
    }),
  }),
});

/**
 * Extension pattern using TypeScript generics
 * Allows type-safe custom attributes per business type
 */
export function createProductSchema<T extends z.ZodRawShape>(
  customFields: T
) {
  return BaseProductSchema.extend({
    customAttributes: z.object(customFields),
  });
}

// === Example: Fashion Store ===
export const FashionProductSchema = createProductSchema({
  material: z.string(),
  careInstructions: z.string(),
  sizeGuide: z.string().url().optional(),
  sustainabilityCertification: z.enum(['GOTS', 'OEKO-TEX', 'none']).optional(),
});

// === Example: Electronics Store ===
export const ElectronicsProductSchema = createProductSchema({
  warranty: z.object({
    duration: z.number(),
    unit: z.enum(['months', 'years']),
    type: z.enum(['manufacturer', 'extended']),
  }),
  specifications: z.record(z.string()),
  energyRating: z.enum(['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D']).optional(),
  compatibleWith: z.array(z.string()).optional(),
});

// === Example: Food/Grocery Store ===
export const FoodProductSchema = createProductSchema({
  nutritionalInfo: z.object({
    calories: z.number(),
    protein: z.number(),
    carbohydrates: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
  }).optional(),
  allergens: z.array(z.string()),
  expirationDays: z.number(),
  storageInstructions: z.string(),
  organic: z.boolean().default(false),
});

// === Example: Digital Products ===
export const DigitalProductSchema = createProductSchema({
  downloadUrl: z.string().url(),
  fileSize: z.number(),
  fileFormat: z.string(),
  licenseType: z.enum(['personal', 'commercial', 'extended']),
  maxDownloads: z.number().optional(),
});
```

### Domain-Specific Metadata Pattern

```typescript
// types/metadata-pattern.ts
import { z } from 'zod';

/**
 * Generic metadata extension pattern
 * Use for adding business-specific fields without schema changes
 */
export const MetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
);

/**
 * Type-safe metadata builder
 */
export function createMetadataSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

// Example: Wine store metadata
const WineMetadataSchema = createMetadataSchema({
  vintage: z.number().int().min(1900).max(2100),
  region: z.string(),
  grapeVariety: z.array(z.string()),
  alcoholContent: z.number(),
  servingTemperature: z.string(),
  pairings: z.array(z.string()),
  awards: z.array(z.object({
    name: z.string(),
    year: z.number(),
    medal: z.enum(['gold', 'silver', 'bronze']),
  })).optional(),
});

// Example: Jewelry store metadata
const JewelryMetadataSchema = createMetadataSchema({
  material: z.enum(['gold', 'silver', 'platinum', 'other']),
  purity: z.string().optional(),  // e.g., "18K", "925"
  gemstones: z.array(z.object({
    type: z.string(),
    carat: z.number().optional(),
    clarity: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
  certificateNumber: z.string().optional(),
  engraving: z.boolean().default(false),
});
```

### Firestore Subcollection Strategies

```typescript
// patterns/subcollections.ts

/**
 * Pattern 1: Variants as subcollection
 * Use when: Many variants per product, need independent queries
 */
interface ProductWithVariantSubcollection {
  // products/{productId}
  product: {
    id: string;
    title: string;
    // ... base fields
  };
  
  // products/{productId}/variants/{variantId}
  variants: {
    id: string;
    sku: string;
    price: number;
    options: Record<string, string>;
    inventory: number;
  }[];
}

/**
 * Pattern 2: Variants embedded in document
 * Use when: Few variants, always fetched together
 */
interface ProductWithEmbeddedVariants {
  id: string;
  title: string;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    options: Record<string, string>;
    inventory: number;
  }>;
}

/**
 * Pattern 3: Reviews as subcollection with aggregation
 * Use when: Many reviews, need pagination
 */
interface ProductReviewPattern {
  // products/{productId}
  product: {
    id: string;
    // Denormalized aggregates (updated via Cloud Function)
    reviewStats: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
    };
  };
  
  // products/{productId}/reviews/{reviewId}
  reviews: {
    id: string;
    customerId: string;
    rating: number;
    title: string;
    body: string;
    verified: boolean;
    createdAt: Date;
  }[];
}

/**
 * Pattern 4: Order history as subcollection
 * Use when: Need to query customer orders independently
 */
interface CustomerOrderPattern {
  // customers/{customerId}
  customer: {
    id: string;
    email: string;
    // Denormalized stats
    orderStats: {
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: Date;
    };
  };
  
  // customers/{customerId}/orders/{orderId}
  // Also exists at: orders/{orderId} (dual write for different query patterns)
}
```

### Unified Product Type Handling

```typescript
// types/unified-product.ts
import { z } from 'zod';

/**
 * Discriminated union pattern for different product types
 * Handles physical, digital, and service products uniformly
 */
const PhysicalProductSchema = z.object({
  type: z.literal('physical'),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(['cm', 'in']),
  }).optional(),
  requiresShipping: z.literal(true),
  inventory: z.object({
    tracked: z.boolean(),
    quantity: z.number().int(),
    allowBackorder: z.boolean().default(false),
  }),
});

const DigitalProductSchema = z.object({
  type: z.literal('digital'),
  requiresShipping: z.literal(false),
  delivery: z.object({
    method: z.enum(['download', 'email', 'access_code']),
    url: z.string().url().optional(),
    expiresAfterDays: z.number().optional(),
  }),
});

const ServiceProductSchema = z.object({
  type: z.literal('service'),
  requiresShipping: z.literal(false),
  booking: z.object({
    duration: z.number(),  // minutes
    requiresAppointment: z.boolean(),
    availableDays: z.array(z.number().int().min(0).max(6)),
  }).optional(),
});

/**
 * Unified product schema using discriminated union
 */
export const UnifiedProductSchema = z.discriminatedUnion('type', [
  PhysicalProductSchema,
  DigitalProductSchema,
  ServiceProductSchema,
]);

export type UnifiedProduct = z.infer<typeof UnifiedProductSchema>;

/**
 * Type guard functions
 */
export function isPhysicalProduct(
  product: UnifiedProduct
): product is z.infer<typeof PhysicalProductSchema> {
  return product.type === 'physical';
}

export function isDigitalProduct(
  product: UnifiedProduct
): product is z.infer<typeof DigitalProductSchema> {
  return product.type === 'digital';
}

export function isServiceProduct(
  product: UnifiedProduct
): product is z.infer<typeof ServiceProductSchema> {
  return product.type === 'service';
}
```

---

## Section 3: Guidelines & Conventions

### Naming Conventions

```typescript
// conventions/naming.ts

/**
 * Collection Naming
 * - Use lowercase with underscores
 * - Plural for collections
 * - Singular for subcollections representing 1:1 relationships
 */
const COLLECTION_NAMES = {
  // Top-level collections
  products: 'products',
  orders: 'orders',
  customers: 'customers',
  carts: 'carts',
  payment_audit: 'payment_audit',
  
  // Subcollections
  variants: 'variants',           // products/{id}/variants
  reviews: 'reviews',             // products/{id}/reviews
  order_items: 'order_items',     // orders/{id}/order_items
  payment_events: 'payment_events', // orders/{id}/payment_events
} as const;

/**
 * Field Naming
 * - Use camelCase for all fields
 * - Prefix external IDs with source name
 * - Use _at suffix for timestamps
 */
const FIELD_CONVENTIONS = {
  // External IDs
  shopify_product_id: 'shopify_product_id',
  shopify_order_id: 'shopify_order_id',
  stripe_payment_intent_id: 'stripe_payment_intent_id',
  aade_mark: 'aade_mark',
  
  // Timestamps
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  deleted_at: 'deletedAt',
  processed_at: 'processedAt',
  
  // Status fields
  status: 'status',
  payment_status: 'paymentStatus',
  fulfillment_status: 'fulfillmentStatus',
} as const;
```

### Timestamp Handling

```typescript
// conventions/timestamps.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Timestamp Convention:
 * - Store all timestamps in UTC
 * - Display in Greek timezone (Europe/Athens)
 * - Use Firestore Timestamp type for queries
 */

// Server-side: Always use UTC
export function createTimestamp(): Timestamp {
  return Timestamp.now();
}

// Client-side: Convert for display
export function formatGreekDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString('el-GR', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatGreekDateTime(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString('el-GR', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// For AADE: Format as YYYY-MM-DD
export function formatAADEDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toISOString().split('T')[0];
}
```

### Soft Delete vs Hard Delete

```typescript
// conventions/deletion.ts
import { z } from 'zod';

/**
 * Soft Delete Pattern
 * Use for: Orders, Customers, Invoices (audit trail required)
 */
export const SoftDeletableSchema = z.object({
  deletedAt: z.date().nullable().default(null),
  deletedBy: z.string().nullable().default(null),
  isDeleted: z.boolean().default(false),
});

// Query helper
export function excludeDeleted<T extends { isDeleted: boolean }>(
  items: T[]
): T[] {
  return items.filter(item => !item.isDeleted);
}

/**
 * Hard Delete Pattern
 * Use for: Carts (ephemeral), Sessions, Temporary data
 */
// Simply delete the document - no special handling needed

/**
 * Archive Pattern
 * Use for: Old orders (move to archive collection after X months)
 */
export async function archiveOldOrders(
  db: FirebaseFirestore.Firestore,
  olderThanMonths: number = 24
) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);
  
  const oldOrders = await db.collection('orders')
    .where('createdAt', '<', cutoffDate)
    .where('isArchived', '==', false)
    .get();
  
  const batch = db.batch();
  
  for (const doc of oldOrders.docs) {
    // Copy to archive
    batch.set(
      db.collection('orders_archive').doc(doc.id),
      { ...doc.data(), archivedAt: new Date() }
    );
    // Mark as archived (or delete)
    batch.update(doc.ref, { isArchived: true });
  }
  
  await batch.commit();
}
```

### Schema Versioning

```typescript
// conventions/versioning.ts
import { z } from 'zod';

/**
 * Schema Versioning Strategy
 * - Include version field in documents
 * - Use migration functions for upgrades
 * - Maintain backward compatibility
 */

export const VersionedDocumentSchema = z.object({
  _schemaVersion: z.number().int().default(1),
});

// Example: Order schema versions
const OrderV1Schema = z.object({
  _schemaVersion: z.literal(1),
  // ... v1 fields
});

const OrderV2Schema = z.object({
  _schemaVersion: z.literal(2),
  // ... v2 fields (added new fields)
});

// Migration function
export function migrateOrderV1toV2(v1Order: z.infer<typeof OrderV1Schema>) {
  return {
    ...v1Order,
    _schemaVersion: 2,
    // Add new fields with defaults
    newField: 'default_value',
  };
}

// Runtime migration on read
export function ensureLatestOrderSchema(order: unknown) {
  const version = (order as any)?._schemaVersion ?? 1;
  
  if (version === 1) {
    return migrateOrderV1toV2(order as z.infer<typeof OrderV1Schema>);
  }
  
  return order;
}
```

### ID Generation Patterns

```typescript
// conventions/ids.ts
import { customAlphabet } from 'nanoid';

/**
 * ID Generation Strategies
 */

// 1. Firestore auto-ID (default)
// Use for: Most documents where ID doesn't matter
// Example: Reviews, audit logs

// 2. Custom readable IDs
// Use for: Orders, invoices (human-readable)
const orderIdGenerator = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

export function generateOrderNumber(): string {
  const prefix = 'ORD';
  const id = orderIdGenerator();
  return `${prefix}-${id}`;  // e.g., ORD-A1B2C3D4
}

// 3. Deterministic IDs (for deduplication)
// Use for: Shopify synced products, external data
export function generateShopifyProductId(shopifyGid: string): string {
  // Extract numeric ID from Shopify GID
  // gid://shopify/Product/123456789 → shopify_product_123456789
  const numericId = shopifyGid.split('/').pop();
  return `shopify_product_${numericId}`;
}

// 4. Composite IDs
// Use for: Unique constraints across multiple fields
export function generateCartLineId(cartId: string, variantId: string): string {
  return `${cartId}_${variantId}`;
}

// 5. Time-ordered IDs (for sorting)
// Use for: Events, logs where chronological order matters
export function generateTimeOrderedId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
```

---

## Section 4: Implementation Roadmap

### Phase Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1        Phase 2        Phase 3        Phase 4        Phase 5│
│  ────────       ────────       ────────       ────────       ───────│
│  FOUNDATION     E-COMMERCE     PAYMENTS &     AI FEATURES    POLISH │
│                 CORE           COMPLIANCE                           │
│                                                                     │
│  Week 1-2       Week 3-5       Week 6-8       Week 9-11      Week 12│
│                                                                     │
│  ▪ Firebase     ▪ Products     ▪ Viva Wallet  ▪ Catalogue    ▪ SEO  │
│  ▪ Next.js      ▪ Cart         ▪ Stripe       ▪ AI Assistant ▪ Perf │
│  ▪ Shopify      ▪ Checkout     ▪ AADE         ▪ Search       ▪ Test │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Core Infrastructure (Weeks 1-2)

**Complexity: Medium (M)**

#### Objectives
- Set up development environment
- Configure Firebase project
- Scaffold Next.js application
- Establish Shopify connection

#### Tasks

| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 1.1 | Create Firebase project with Firestore | S | None |
| 1.2 | Configure Firebase Authentication | S | 1.1 |
| 1.3 | Set up Cloud Functions (Python) | M | 1.1 |
| 1.4 | Initialize Next.js 14 with App Router | S | None |
| 1.5 | Configure Tailwind CSS + shadcn/ui | S | 1.4 |
| 1.6 | Set up TypeScript strict mode | S | 1.4 |
| 1.7 | Create Shopify Storefront API client | M | 1.4 |
| 1.8 | Implement basic GraphQL queries | M | 1.7 |
| 1.9 | Set up environment configuration | S | All |
| 1.10 | Create CI/CD pipeline (GitHub Actions) | M | All |

#### Deliverables
- [ ] Firebase project with Firestore rules
- [ ] Next.js app with basic routing
- [ ] Shopify connection verified
- [ ] Development environment documented

#### Testing Checkpoint
```bash
# Verify Shopify connection
curl -X POST https://your-store.myshopify.com/api/2024-01/graphql.json \
  -H "X-Shopify-Storefront-Access-Token: $TOKEN" \
  -d '{"query": "{ shop { name } }"}'

# Verify Firebase Functions
firebase emulators:start
curl http://localhost:5001/project-id/us-central1/healthCheck
```

---

### Phase 2: E-commerce Core (Weeks 3-5)

**Complexity: Large (L)**

#### Objectives
- Display products from Shopify
- Implement cart functionality
- Build checkout flow (pre-payment)

#### Tasks

| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 2.1 | Product listing page with pagination | M | Phase 1 |
| 2.2 | Product detail page with variants | M | 2.1 |
| 2.3 | Collection pages | M | 2.1 |
| 2.4 | Search functionality | M | 2.1 |
| 2.5 | Cart context with Shopify Cart API | L | 2.2 |
| 2.6 | Cart drawer/page UI | M | 2.5 |
| 2.7 | Checkout information form | M | 2.5 |
| 2.8 | Address validation | S | 2.7 |
| 2.9 | Shipping method selection | M | 2.7 |
| 2.10 | Order summary component | S | 2.7 |
| 2.11 | Guest checkout flow | M | 2.7 |
| 2.12 | Customer account (optional) | M | 2.7 |

#### Deliverables
- [ ] Product catalog fully functional
- [ ] Cart persists across sessions
- [ ] Checkout collects all required info
- [ ] Mobile-responsive design

#### Testing Checkpoint
```typescript
// E2E test: Add to cart flow
test('user can add product to cart', async ({ page }) => {
  await page.goto('/products/test-product');
  await page.click('[data-testid="add-to-cart"]');
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
});
```

---

### Phase 3: Payments & Compliance (Weeks 6-8)

**Complexity: Extra Large (XL)**

#### Objectives
- Integrate payment gateways
- Implement AADE myDATA compliance
- Set up webhook handling

#### Tasks

| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 3.1 | Viva Wallet OAuth setup | M | Phase 2 |
| 3.2 | Viva Wallet payment flow | L | 3.1 |
| 3.3 | Viva Wallet webhooks | M | 3.2 |
| 3.4 | Stripe Payment Intents | M | Phase 2 |
| 3.5 | Stripe Elements integration | M | 3.4 |
| 3.6 | Stripe webhooks | M | 3.4 |
| 3.7 | Everypay integration | M | Phase 2 |
| 3.8 | Payment provider selector UI | S | 3.2, 3.4, 3.7 |
| 3.9 | AADE API authentication | M | Phase 2 |
| 3.10 | Invoice XML generation | L | 3.9 |
| 3.11 | Invoice transmission | L | 3.10 |
| 3.12 | AADE webhook/polling | M | 3.11 |
| 3.13 | Payment → Invoice trigger | M | 3.3, 3.6, 3.11 |
| 3.14 | Refund processing | M | 3.2, 3.4, 3.7 |
| 3.15 | Credit note generation | M | 3.14, 3.10 |
| 3.16 | Payment audit logging | M | All |

#### Deliverables
- [ ] All three payment gateways functional
- [ ] AADE invoices transmitting successfully
- [ ] Refunds working end-to-end
- [ ] Audit trail complete

#### Testing Checkpoint
```python
# Test AADE invoice transmission
def test_invoice_transmission():
    invoice = create_test_invoice()
    result = transmit_to_aade(invoice, test_mode=True)
    assert result.mark is not None
    assert result.uid is not None
```

---

### Phase 4: AI Features (Weeks 9-11)

**Complexity: Large (L)**

#### Objectives
- Implement catalogue ingestion pipeline
- Build AI buyer assistant
- Add intelligent search

#### Tasks

| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 4.1 | Product data extraction pipeline | M | Phase 2 |
| 4.2 | Vector embeddings generation | M | 4.1 |
| 4.3 | Vector store setup (Pinecone/similar) | M | 4.2 |
| 4.4 | RAG pipeline implementation | L | 4.3 |
| 4.5 | Chat interface component | M | 4.4 |
| 4.6 | Product recommendation logic | M | 4.4 |
| 4.7 | Semantic search implementation | M | 4.3 |
| 4.8 | Search UI with AI suggestions | M | 4.7 |
| 4.9 | Conversation history storage | S | 4.5 |
| 4.10 | AI response streaming | M | 4.5 |

#### Deliverables
- [ ] AI assistant answering product questions
- [ ] Semantic search returning relevant results
- [ ] Recommendations based on context
- [ ] Conversation history persisted

#### Testing Checkpoint
```typescript
// Test AI assistant response
test('AI assistant recommends products', async () => {
  const response = await aiAssistant.query(
    'I need a gift for someone who likes cooking'
  );
  expect(response.products.length).toBeGreaterThan(0);
  expect(response.explanation).toBeTruthy();
});
```

---

### Phase 5: Polish & Optimization (Week 12)

**Complexity: Medium (M)**

#### Objectives
- Implement SEO infrastructure
- Optimize performance
- Complete testing suite
- Prepare deployment procedures

#### Tasks

| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| 5.1 | generateMetadata for all pages | M | Phase 2 |
| 5.2 | Schema.org structured data | M | 5.1 |
| 5.3 | Dynamic sitemap generation | S | 5.1 |
| 5.4 | robots.txt + llms.txt | S | 5.1 |
| 5.5 | Image optimization audit | M | Phase 2 |
| 5.6 | Core Web Vitals optimization | M | 5.5 |
| 5.7 | Bundle size analysis | S | All |
| 5.8 | E2E test suite completion | L | All |
| 5.9 | Load testing | M | All |
| 5.10 | Security audit | M | All |
| 5.11 | Documentation completion | M | All |
| 5.12 | Template cloning procedure | M | All |

#### Deliverables
- [ ] Lighthouse score > 90 all categories
- [ ] E2E tests passing
- [ ] Security checklist complete
- [ ] Deployment documentation ready

#### Testing Checkpoint
```bash
# Lighthouse CI
npx lhci autorun --config=lighthouserc.json

# Expected results:
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

---

### Deployment Procedures

#### Template Cloning Process

```bash
#!/bin/bash
# clone-template.sh

# 1. Clone repository
git clone https://github.com/your-org/ecommerce-template.git $CLIENT_NAME
cd $CLIENT_NAME

# 2. Remove git history
rm -rf .git
git init

# 3. Update configuration
cp .env.example .env.local
echo "Update .env.local with client-specific values"

# 4. Create Firebase project
firebase projects:create $CLIENT_NAME-ecommerce

# 5. Deploy Firebase
firebase deploy --only firestore:rules,functions

# 6. Deploy Next.js (Vercel)
vercel --prod

# 7. Configure custom domain
echo "Add DNS records for $CLIENT_DOMAIN"
```

#### Client Onboarding Checklist

```markdown
## New Client Setup

### Prerequisites
- [ ] Shopify store created
- [ ] Shopify Storefront API access token
- [ ] Viva Wallet merchant account
- [ ] AADE myDATA credentials (production)
- [ ] Domain name configured

### Configuration
- [ ] Firebase project created
- [ ] Environment variables set
- [ ] Payment webhooks configured
- [ ] AADE test transmission successful

### Customization
- [ ] Logo and branding assets
- [ ] Color scheme (Tailwind config)
- [ ] Business information (footer, about)
- [ ] Shipping zones and rates
- [ ] Tax configuration

### Go-Live
- [ ] SSL certificate active
- [ ] Production payment credentials
- [ ] AADE production mode enabled
- [ ] Monitoring configured
- [ ] Backup procedures documented
```

---

## Summary

| Document Section | Purpose |
|-----------------|---------|
| **Fixed Schemas** | Non-negotiable structures for AADE, Shopify, payments |
| **Extension Patterns** | Flexible patterns for business-specific customization |
| **Guidelines** | Conventions for naming, timestamps, versioning |
| **Roadmap** | 12-week implementation plan with milestones |

**Key Principles:**
1. Regulatory schemas are immutable
2. Business logic is extensible via patterns
3. Type safety throughout with Zod
4. Phased delivery with testing checkpoints

**Next:** See [00_master_index.md](./00_master_index.md) for complete documentation overview.
