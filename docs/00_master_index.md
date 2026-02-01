# 00: Master Index - Headless E-commerce Template

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Tech Stack:** Next.js 14+ | Firebase | Shopify | Greek AADE Compliance

---

## Quick Navigation

| # | Document | Description | Key Topics |
|---|----------|-------------|------------|
| 01 | [System Architecture](./01_system_architecture.md) | High-level system design | Architecture diagrams, data flow, infrastructure |
| 02 | [Frontend Integration](./02_frontend_integration.md) | Next.js & Shopify patterns | App Router, Storefront API, components |
| 03 | [AI Systems](./03_ai_systems.md) | AI-powered features | RAG, embeddings, buyer assistant |
| 04 | [AADE myDATA Compliance](./04_aade_mydata_compliance.md) | Greek tax compliance | Invoice transmission, XML schemas |
| 05 | [Payments, SEO & Infrastructure](./05_payments_seo_infrastructure.md) | Payments & optimization | Viva Wallet, Stripe, SEO, Core Web Vitals |
| 06 | [Data Contracts & Roadmap](./06_data_contracts_roadmap.md) | Schemas & implementation | Zod schemas, phases, deployment |

---

## Document Dependencies

```
                    ┌─────────────────────┐
                    │  00_master_index    │
                    │    (This file)      │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 01_system_       │ │ 02_frontend_     │ │ 03_ai_systems    │
│ architecture     │ │ integration      │ │                  │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         │         ┌──────────┴──────────┐         │
         │         │                     │         │
         ▼         ▼                     ▼         ▼
┌──────────────────────┐       ┌──────────────────────┐
│ 04_aade_mydata_      │       │ 05_payments_seo_     │
│ compliance           │◀─────▶│ infrastructure       │
└──────────┬───────────┘       └──────────┬───────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │ 06_data_contracts_   │
              │ roadmap              │
              └──────────────────────┘
```

### Recommended Reading Order

**For New Developers:**
1. `01_system_architecture.md` - Understand the big picture
2. `02_frontend_integration.md` - Learn the frontend patterns
3. `06_data_contracts_roadmap.md` - Review schemas and roadmap
4. Remaining documents as needed

**For AI Coding Agents:**
1. `06_data_contracts_roadmap.md` - Start with schemas
2. `01_system_architecture.md` - Understand connections
3. Task-specific document based on current phase

**For Compliance Review:**
1. `04_aade_mydata_compliance.md` - Tax requirements
2. `05_payments_seo_infrastructure.md` - Payment handling
3. `06_data_contracts_roadmap.md` - Audit trail schemas

---

## Topic Quick Reference

### Frontend Development

| Topic | Document | Section |
|-------|----------|---------|
| App Router setup | 02 | Project Structure |
| Server Components | 02 | Data Fetching Patterns |
| Client Components | 02 | Interactive Components |
| Shopify GraphQL queries | 02 | Storefront API Integration |
| Cart implementation | 02 | Cart Context |
| Product pages | 02 | Dynamic Routes |
| SEO metadata | 05 | Next.js Metadata API |
| Structured data | 05 | Schema.org |
| Image optimization | 05 | Core Web Vitals |

### Backend Development

| Topic | Document | Section |
|-------|----------|---------|
| Firebase setup | 01 | Infrastructure |
| Cloud Functions (Python) | 01 | Backend Services |
| Firestore schema | 06 | Fixed Schemas |
| Authentication | 01 | Security |
| Webhook handling | 05 | Payment Gateway Integration |
| Background jobs | 01 | Cloud Functions |

### Payment Integration

| Topic | Document | Section |
|-------|----------|---------|
| Viva Wallet | 05 | Viva Wallet Integration |
| Stripe | 05 | Stripe Integration |
| Everypay | 05 | Everypay Integration |
| Refunds | 05 | Common Payment Patterns |
| Payment audit | 06 | Payment Audit Trail |
| PCI compliance | 05 | PCI Compliance Considerations |

### AADE Compliance

| Topic | Document | Section |
|-------|----------|---------|
| myDATA overview | 04 | Introduction |
| Invoice types | 04 | Invoice Types |
| XML schema | 04 | XML Structure |
| API authentication | 04 | Authentication |
| Transmission flow | 04 | Transmission Process |
| Error handling | 04 | Error Codes |
| Credit notes | 04 | Credit Notes |

### AI Features

| Topic | Document | Section |
|-------|----------|---------|
| Architecture | 03 | System Overview |
| Catalogue ingestion | 03 | Data Pipeline |
| Vector embeddings | 03 | Embedding Generation |
| RAG implementation | 03 | Retrieval Pipeline |
| Buyer assistant | 03 | Chat Interface |
| Semantic search | 03 | Search Implementation |

### Data & Schemas

| Topic | Document | Section |
|-------|----------|---------|
| Order schema | 06 | Order ↔ Shopify Mapping |
| Customer schema | 06 | Customer Data |
| Product extensions | 06 | Extension Patterns |
| Cart alignment | 06 | Cart ↔ Shopify Cart API |
| Naming conventions | 06 | Guidelines & Conventions |
| ID generation | 06 | ID Generation Patterns |

### Deployment & Operations

| Topic | Document | Section |
|-------|----------|---------|
| Implementation phases | 06 | Implementation Roadmap |
| Template cloning | 06 | Deployment Procedures |
| Client onboarding | 06 | Client Onboarding Checklist |
| CI/CD | 01 | DevOps |
| Monitoring | 01 | Observability |

---

## Glossary

### Business Terms

| Term | Definition |
|------|------------|
| **AADE** | Ανεξάρτητη Αρχή Δημοσίων Εσόδων - Greek Independent Authority for Public Revenue |
| **myDATA** | My Digital Accounting and Tax Application - AADE's e-invoicing platform |
| **ΑΦΜ (AFM)** | Αριθμός Φορολογικού Μητρώου - Greek Tax Identification Number (9 digits) |
| **ΜΑΡΚ (MARK)** | Unique identifier assigned by AADE to each transmitted invoice |
| **UID** | Unique Invoice ID returned by AADE |
| **B2B** | Business-to-Business transaction (requires counterparty VAT) |
| **B2C** | Business-to-Consumer transaction (retail) |
| **ΑΛΠ** | Απόδειξη Λιανικής Πώλησης - Retail Sales Receipt |
| **ΔΟΥ** | Δημόσια Οικονομική Υπηρεσία - Tax Office |

### Technical Terms

| Term | Definition |
|------|------------|
| **Headless Commerce** | Architecture where frontend is decoupled from e-commerce backend |
| **Storefront API** | Shopify's GraphQL API for building custom storefronts |
| **ISR** | Incremental Static Regeneration - Next.js feature for updating static pages |
| **RAG** | Retrieval-Augmented Generation - AI pattern combining search with LLM |
| **Vector Embedding** | Numerical representation of text for semantic similarity |
| **Payment Intent** | Stripe's object representing a payment lifecycle |
| **Webhook** | HTTP callback for real-time event notifications |
| **PCI DSS** | Payment Card Industry Data Security Standard |
| **Core Web Vitals** | Google's metrics for user experience (LCP, FID, CLS) |

### Acronyms

| Acronym | Expansion |
|---------|-----------|
| **GID** | Global ID (Shopify's unique identifier format) |
| **LCP** | Largest Contentful Paint |
| **FID** | First Input Delay |
| **CLS** | Cumulative Layout Shift |
| **SSR** | Server-Side Rendering |
| **SSG** | Static Site Generation |
| **OG** | Open Graph (social media metadata) |
| **VAT** | Value Added Tax |
| **EUR** | Euro currency code |

---

## External Resources

### Shopify

| Resource | URL |
|----------|-----|
| Storefront API Reference | https://shopify.dev/docs/api/storefront |
| GraphQL Admin API | https://shopify.dev/docs/api/admin-graphql |
| Hydrogen (React framework) | https://hydrogen.shopify.dev/ |
| Checkout API | https://shopify.dev/docs/api/storefront/checkout |

### Firebase

| Resource | URL |
|----------|-----|
| Firestore Documentation | https://firebase.google.com/docs/firestore |
| Cloud Functions (Python) | https://firebase.google.com/docs/functions/get-started?gen=2nd |
| Security Rules | https://firebase.google.com/docs/firestore/security/get-started |
| Firebase Emulator Suite | https://firebase.google.com/docs/emulator-suite |

### AADE myDATA

| Resource | URL |
|----------|-----|
| myDATA Portal | https://www.aade.gr/mydata |
| API Documentation | https://www.aade.gr/sites/default/files/2023-12/myDATA%20API%20Documentation%20v1.0.7_0.pdf |
| Test Environment | https://mydata-dev.azure-api.net/ |
| Invoice Types Reference | https://www.aade.gr/mydata/timologisi |

### Payment Providers

| Provider | Documentation |
|----------|---------------|
| Viva Wallet | https://developer.vivawallet.com/ |
| Stripe | https://stripe.com/docs |
| Everypay | https://www.everypay.gr/docs/ |

### Next.js

| Resource | URL |
|----------|-----|
| App Router | https://nextjs.org/docs/app |
| Metadata API | https://nextjs.org/docs/app/api-reference/functions/generate-metadata |
| Image Optimization | https://nextjs.org/docs/app/building-your-application/optimizing/images |
| Server Actions | https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions |

### UI & Styling

| Resource | URL |
|----------|-----|
| shadcn/ui | https://ui.shadcn.com/ |
| Tailwind CSS | https://tailwindcss.com/docs |
| Radix UI Primitives | https://www.radix-ui.com/primitives |

---

## Getting Started for AI Coding Agents

### Context Loading

When starting a new coding session, load these documents in order:

```markdown
1. Load 06_data_contracts_roadmap.md
   - Understand all Zod schemas
   - Note the current implementation phase
   - Review naming conventions

2. Load the phase-specific document:
   - Phase 1-2: 01_system_architecture.md + 02_frontend_integration.md
   - Phase 3: 04_aade_mydata_compliance.md + 05_payments_seo_infrastructure.md
   - Phase 4: 03_ai_systems.md
   - Phase 5: 05_payments_seo_infrastructure.md (SEO section)

3. Reference other documents as needed for specific tasks
```

### Key Implementation Patterns

```typescript
// 1. Always use Zod for runtime validation
import { z } from 'zod';
const result = OrderSchema.safeParse(data);
if (!result.success) {
  console.error(result.error.issues);
}

// 2. Use Server Components by default
// app/products/[handle]/page.tsx
export default async function ProductPage({ params }) {
  const product = await getProduct(params.handle); // Server-side fetch
  return <ProductDisplay product={product} />;
}

// 3. Use 'use client' only when necessary
'use client';
// For: useState, useEffect, event handlers, browser APIs

// 4. Handle errors gracefully
try {
  await transmitInvoice(order);
} catch (error) {
  await logError(error);
  await queueForRetry(order.id);
}

// 5. Always include audit logging for payments
await logPaymentEvent({
  orderId,
  eventType: 'payment_succeeded',
  provider: 'stripe',
  transactionId,
});
```

### Common Tasks Reference

| Task | Primary Document | Key Code Location |
|------|-----------------|-------------------|
| Add new product field | 06 | `types/product-extensions.ts` |
| Modify checkout flow | 02 | `app/checkout/` |
| Add payment provider | 05 | `functions/payments/` |
| Update invoice format | 04 | `functions/aade/` |
| Add AI feature | 03 | `functions/ai/` |
| Optimize performance | 05 | `app/` (metadata, images) |

### Environment Variables Required

```bash
# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxxxx

# Firebase
FIREBASE_PROJECT_ID=your-project
FIREBASE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net

# Payments
VIVA_CLIENT_ID=xxxxx
VIVA_CLIENT_SECRET=xxxxx
VIVA_MERCHANT_ID=xxxxx
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_xxxxx
EVERYPAY_SECRET_KEY=xxxxx

# AADE
AADE_USER_ID=xxxxx
AADE_SUBSCRIPTION_KEY=xxxxx
AADE_VAT_NUMBER=123456789

# AI (if using)
OPENAI_API_KEY=sk-xxxxx
PINECONE_API_KEY=xxxxx
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial release - all 6 documents |

---

## Support & Maintenance

For questions about this template:
1. Check the relevant document section
2. Review external documentation links
3. Consult the glossary for term definitions

**Template maintained by:** [Your Organization]  
**License:** [Your License]
