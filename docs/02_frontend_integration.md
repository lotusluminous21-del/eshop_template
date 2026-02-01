# Frontend Integration Guide

## Document Overview

This document provides comprehensive implementation guidance for integrating Next.js with Firebase and Shopify Storefront API. It covers project structure, configuration patterns, component architecture, and caching strategies.

**Related Documents:**
- [01_system_architecture.md](./01_system_architecture.md) - System architecture overview
- [03_ai_systems.md](./03_ai_systems.md) - AI/ML system specifications

---

## Part 1: Next.js + Firebase Integration

### 1.1 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (shop)/                   # Shop route group
│   │   ├── products/
│   │   │   ├── [handle]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── collections/
│   │   │   ├── [handle]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (account)/                # Protected account routes
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── admin/                    # Admin dashboard
│   │   ├── catalogue/
│   │   │   └── page.tsx
│   │   ├── orders/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/                      # API routes
│   │   ├── webhooks/
│   │   │   ├── shopify/
│   │   │   │   └── route.ts
│   │   │   └── payment/
│   │   │       └── [provider]/
│   │   │           └── route.ts
│   │   └── ai/
│   │       └── chat/
│   │           └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── shop/                     # Shop-specific components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── AddToCartButton.tsx
│   │   ├── CartDrawer.tsx
│   │   └── VariantSelector.tsx
│   ├── chat/                     # AI chat components
│   │   ├── ChatWidget.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Firebase initialization
│   │   ├── auth.ts               # Auth utilities
│   │   ├── firestore.ts          # Firestore utilities
│   │   └── functions.ts          # Callable functions
│   ├── shopify/
│   │   ├── client.ts             # Storefront API client
│   │   ├── queries.ts            # GraphQL queries
│   │   ├── mutations.ts          # GraphQL mutations
│   │   └── types.ts              # Generated types
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useProducts.ts
│   └── useFirestore.ts
├── stores/
│   ├── cartStore.ts              # Zustand cart store
│   ├── uiStore.ts                # UI state
│   └── userStore.ts              # User preferences
├── types/
│   ├── shopify.ts                # Shopify types
│   ├── firebase.ts               # Firebase types
│   └── index.ts
└── providers/
    ├── FirebaseProvider.tsx
    ├── QueryProvider.tsx
    └── Providers.tsx             # Combined providers
```

### 1.2 Firebase Configuration and Initialization

```typescript
// lib/firebase/config.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton pattern for Firebase app
let firebaseApp: FirebaseApp;

export function getFirebaseApp() {
  if (!firebaseApp && !getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    
    // Connect to emulators in development
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
      const auth = getAuth(firebaseApp);
      const db = getFirestore(firebaseApp);
      const functions = getFunctions(firebaseApp, 'europe-west1');
      const storage = getStorage(firebaseApp);
      
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  }
  return firebaseApp || getApps()[0];
}

// Export initialized services
export const getFirebaseAuth = () => getAuth(getFirebaseApp());
export const getFirebaseDb = () => getFirestore(getFirebaseApp());
export const getFirebaseFunctions = () => getFunctions(getFirebaseApp(), 'europe-west1');
export const getFirebaseStorage = () => getStorage(getFirebaseApp());
```

### 1.3 ReactFire Setup

```typescript
// providers/FirebaseProvider.tsx
'use client';

import { ReactNode } from 'react';
import { FirebaseAppProvider, AuthProvider, FirestoreProvider, FunctionsProvider } from 'reactfire';
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from '@/lib/firebase/config';

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const app = getFirebaseApp();
  const auth = getFirebaseAuth();
  const firestore = getFirebaseDb();
  const functions = getFirebaseFunctions();

  return (
    <FirebaseAppProvider firebaseApp={app}>
      <AuthProvider sdk={auth}>
        <FirestoreProvider sdk={firestore}>
          <FunctionsProvider sdk={functions}>
            {children}
          </FunctionsProvider>
        </FirestoreProvider>
      </AuthProvider>
    </FirebaseAppProvider>
  );
}
```

```typescript
// providers/Providers.tsx
'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FirebaseProvider } from './FirebaseProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        {children}
      </FirebaseProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from '@/providers/Providers';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 1.4 Server Components vs Client Components with Firebase

#### Decision Matrix

| Use Case | Component Type | Reason |
|----------|---------------|--------|
| Product listing (from Shopify) | Server Component | SEO, initial load performance |
| Product detail page | Server Component | SEO, can fetch on server |
| User authentication state | Client Component | Requires Firebase Auth SDK |
| Real-time data (chat, notifications) | Client Component | Requires Firestore listeners |
| Cart operations | Client Component | User interaction, optimistic updates |
| Admin dashboard | Client Component | Heavy interactivity, real-time updates |
| Static content (about, policies) | Server Component | No interactivity needed |

#### Server Component Pattern (Data Fetching)

```typescript
// app/(shop)/products/[handle]/page.tsx
// This is a SERVER COMPONENT - no 'use client' directive

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/shopify/queries';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductInfo } from '@/components/shop/ProductInfo';
import { AddToCartSection } from '@/components/shop/AddToCartSection'; // Client Component
import { ProductSkeleton } from '@/components/shop/ProductSkeleton';

interface ProductPageProps {
  params: { handle: string };
}

// Generate static params for popular products (optional ISR)
export async function generateStaticParams() {
  const products = await getPopularProducts();
  return products.map((product) => ({ handle: product.handle }));
}

// Metadata for SEO
export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProduct(params.handle);
  if (!product) return { title: 'Product Not Found' };
  
  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [product.featuredImage?.url],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProduct(params.handle);
  
  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Server-rendered gallery */}
        <ProductGallery images={product.images} />
        
        <div>
          {/* Server-rendered product info */}
          <ProductInfo product={product} />
          
          {/* Client component for interactivity */}
          <Suspense fallback={<div>Loading...</div>}>
            <AddToCartSection product={product} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

#### Client Component Pattern (Interactivity)

```typescript
// components/shop/AddToCartSection.tsx
'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { VariantSelector } from './VariantSelector';
import { QuantitySelector } from './QuantitySelector';
import { Button } from '@/components/ui/button';
import { Product, ProductVariant } from '@/types/shopify';

interface AddToCartSectionProps {
  product: Product;
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0]
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem, isAdding } = useCart();

  const handleAddToCart = async () => {
    await addItem({
      merchandiseId: selectedVariant.id,
      quantity,
    });
  };

  return (
    <div className="space-y-4">
      <VariantSelector
        variants={product.variants}
        selectedVariant={selectedVariant}
        onSelect={setSelectedVariant}
      />
      
      <QuantitySelector
        quantity={quantity}
        onChange={setQuantity}
        max={selectedVariant.quantityAvailable}
      />
      
      <Button
        onClick={handleAddToCart}
        disabled={!selectedVariant.availableForSale || isAdding}
        className="w-full"
      >
        {isAdding ? 'Adding...' : 'Add to Cart'}
      </Button>
    </div>
  );
}
```

### 1.5 Firebase Callable Functions Integration

```typescript
// lib/firebase/functions.ts
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { getFirebaseFunctions } from './config';
import { z } from 'zod';

// Type-safe callable function wrapper
function createCallable<TInput, TOutput>(
  name: string,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>
) {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<TInput, TOutput>(functions, name);

  return async (data: TInput): Promise<TOutput> => {
    // Validate input
    const validatedInput = inputSchema.parse(data);
    
    // Call function
    const result: HttpsCallableResult<TOutput> = await callable(validatedInput);
    
    // Validate output
    return outputSchema.parse(result.data);
  };
}

// Schema definitions
const InitializeCheckoutInput = z.object({
  cartId: z.string(),
  paymentMethod: z.enum(['viva_wallet', 'stripe', 'everypay']),
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    address1: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }),
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    address1: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
});

const InitializeCheckoutOutput = z.object({
  success: z.boolean(),
  checkoutUrl: z.string(),
  orderId: z.string(),
  expiresAt: z.string(),
});

const CatalogueJobInput = z.object({
  fileUrl: z.string(),
  fileName: z.string(),
  mappingConfig: z.record(z.string()).optional(),
});

const CatalogueJobOutput = z.object({
  jobId: z.string(),
  status: z.enum(['pending', 'processing', 'review_required', 'completed', 'failed']),
});

// Exported callable functions
export const initializeCheckout = createCallable(
  'initializeCheckout',
  InitializeCheckoutInput,
  InitializeCheckoutOutput
);

export const startCatalogueIngestion = createCallable(
  'startCatalogueIngestion',
  CatalogueJobInput,
  CatalogueJobOutput
);

export const getCatalogueJobStatus = createCallable(
  'getCatalogueJobStatus',
  z.object({ jobId: z.string() }),
  CatalogueJobOutput
);

// Usage in components
export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkout = async (data: z.infer<typeof InitializeCheckoutInput>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await initializeCheckout(data);
      // Redirect to checkout URL
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, isLoading, error };
}
```

### 1.6 Real-time Firestore Listeners

```typescript
// hooks/useFirestore.ts
'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  QueryConstraint,
  DocumentData
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { useAuth } from './useAuth';

// Generic real-time document hook
export function useDocument<T extends DocumentData>(
  collectionPath: string,
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    const docRef = doc(db, collectionPath, documentId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionPath, documentId]);

  return { data, loading, error };
}

// Generic real-time collection hook
export function useCollection<T extends DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionPath, JSON.stringify(constraints)]);

  return { data, loading, error };
}

// Specific hooks for common use cases
export function useUserOrders() {
  const { user, clientId } = useAuth();
  
  return useCollection<Order>(
    `clients/${clientId}/orders`,
    user ? [
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    ] : []
  );
}

export function useCatalogueJob(jobId: string | null) {
  const { clientId } = useAuth();
  
  return useDocument<CatalogueJob>(
    `clients/${clientId}/ai_jobs`,
    jobId
  );
}

// Real-time job progress component
export function JobProgressTracker({ jobId }: { jobId: string }) {
  const { data: job, loading, error } = useCatalogueJob(jobId);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusBadge status={job.status} />
        <span>{job.fileName}</span>
      </div>
      
      {job.status === 'processing' && (
        <ProgressBar value={job.progress} max={100} />
      )}
      
      {job.status === 'review_required' && (
        <div>
          <p>{job.productsExtracted} products extracted</p>
          <p>{job.issuesFound} issues require review</p>
          <Button onClick={() => router.push(`/admin/catalogue/review/${jobId}`)}>
            Review Products
          </Button>
        </div>
      )}
      
      {job.status === 'failed' && (
        <ErrorMessage message={job.errorMessage} />
      )}
    </div>
  );
}
```

### 1.7 Firebase Auth with Next.js Middleware

```typescript
// hooks/useAuth.ts
'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  clientId: string | null;
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<{ clientId: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Get custom claims
        const tokenResult = await user.getIdTokenResult();
        setClaims({
          clientId: tokenResult.claims.clientId as string,
          role: tokenResult.claims.role as string,
        });
        
        // Set session cookie for middleware
        const token = await user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } else {
        setClaims(null);
        // Clear session cookie
        await fetch('/api/auth/session', { method: 'DELETE' });
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      clientId: claims?.clientId ?? null,
      role: claims?.role ?? null,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

```typescript
// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase/admin';

// Initialize Firebase Admin
initAdmin();

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  
  try {
    // Verify the ID token
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Create session cookie (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await getAuth().createSessionCookie(token, { expiresIn });
    
    // Set cookie
    cookies().set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function DELETE() {
  cookies().delete('__session');
  return NextResponse.json({ success: true });
}
```

### 1.8 Environment Configuration for Multi-Client Deployments

```bash
# .env.example - Template for client deployments

# ============================================
# CLIENT CONFIGURATION
# ============================================
NEXT_PUBLIC_CLIENT_ID=
NEXT_PUBLIC_CLIENT_NAME=
NEXT_PUBLIC_SITE_URL=

# ============================================
# FIREBASE CONFIGURATION
# ============================================
# Public (exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-side only
FIREBASE_SERVICE_ACCOUNT_KEY=

# Development
NEXT_PUBLIC_USE_EMULATORS=false

# ============================================
# SHOPIFY CONFIGURATION
# ============================================
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=
SHOPIFY_ADMIN_API_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# ============================================
# PAYMENT GATEWAYS
# ============================================
# Viva Wallet
VIVA_WALLET_MERCHANT_ID=
VIVA_WALLET_API_KEY=
VIVA_WALLET_SOURCE_CODE=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Everypay
EVERYPAY_API_KEY=
EVERYPAY_PUBLIC_KEY=

# ============================================
# AADE myDATA (Greek clients only)
# ============================================
AADE_USER_ID=
AADE_SUBSCRIPTION_KEY=
AADE_ENVIRONMENT=sandbox

# ============================================
# AI CONFIGURATION
# ============================================
GOOGLE_AI_API_KEY=
AI_ASSISTANT_PERSONA=
AI_ASSISTANT_LANGUAGE=en

# ============================================
# FEATURE FLAGS
# ============================================
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_DIGITAL_PRODUCTS=true
NEXT_PUBLIC_ENABLE_SERVICES=false
```

```typescript
// lib/config.ts
import { z } from 'zod';

const envSchema = z.object({
  // Client
  NEXT_PUBLIC_CLIENT_ID: z.string(),
  NEXT_PUBLIC_CLIENT_NAME: z.string(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  
  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string(),
  
  // Shopify
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: z.string(),
  NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN: z.string(),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_AI_CHAT: z.string().transform(v => v === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_DIGITAL_PRODUCTS: z.string().transform(v => v === 'true').default('true'),
});

export const config = envSchema.parse(process.env);

// Type-safe feature flags
export const features = {
  aiChat: config.NEXT_PUBLIC_ENABLE_AI_CHAT,
  digitalProducts: config.NEXT_PUBLIC_ENABLE_DIGITAL_PRODUCTS,
};
```

---

## Part 2: Shopify Storefront API Integration

### 2.1 GraphQL Client Setup

```typescript
// lib/shopify/client.ts
import { createStorefrontApiClient, StorefrontApiClient } from '@shopify/storefront-api-client';

let client: StorefrontApiClient | null = null;

export function getShopifyClient(): StorefrontApiClient {
  if (!client) {
    client = createStorefrontApiClient({
      storeDomain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!,
      apiVersion: '2024-01',
      publicAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
    });
  }
  return client;
}

// Type-safe query wrapper
export async function shopifyFetch<T>({
  query,
  variables,
  cache = 'force-cache',
  tags,
}: {
  query: string;
  variables?: Record<string, unknown>;
  cache?: RequestCache;
  tags?: string[];
}): Promise<T> {
  const client = getShopifyClient();
  
  const { data, errors } = await client.request(query, {
    variables,
    // Next.js fetch options for caching
    fetchOptions: {
      cache,
      next: tags ? { tags } : undefined,
    },
  });

  if (errors) {
    throw new Error(errors.map(e => e.message).join(', '));
  }

  return data as T;
}
```

### 2.2 Type Generation with Codegen

```typescript
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: {
    [`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`]: {
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
      },
    },
  },
  documents: ['lib/shopify/**/*.ts', '!lib/shopify/types.ts'],
  generates: {
    'lib/shopify/types.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
      ],
      config: {
        avoidOptionals: true,
        skipTypename: false,
        enumsAsTypes: true,
        scalars: {
          DateTime: 'string',
          Decimal: 'string',
          HTML: 'string',
          Money: 'string',
          URL: 'string',
        },
      },
    },
  },
};

export default config;
```

```json
// package.json scripts
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

### 2.3 Product Queries

```typescript
// lib/shopify/queries.ts
import { shopifyFetch } from './client';
import type { Product, Collection, ProductConnection } from './types';

// Fragment for reusable product fields
const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 20) {
      edges {
        node {
          url
          altText
          width
          height
        }
      }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          availableForSale
          quantityAvailable
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
          image {
            url
            altText
          }
        }
      }
    }
    options {
      id
      name
      values
    }
    metafields(identifiers: [
      { namespace: "custom", key: "specifications" },
      { namespace: "custom", key: "digital_download_url" },
      { namespace: "custom", key: "service_duration" }
    ]) {
      key
      namespace
      value
      type
    }
    seo {
      title
      description
    }
  }
`;

// Get single product by handle
export async function getProduct(handle: string): Promise<Product | null> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        ...ProductFields
      }
    }
  `;

  const data = await shopifyFetch<{ product: Product | null }>({
    query,
    variables: { handle },
    tags: [`product-${handle}`],
  });

  return data.product;
}

// Get products with pagination and filtering
export async function getProducts({
  first = 20,
  after,
  query: searchQuery,
  sortKey = 'RELEVANCE',
  reverse = false,
}: {
  first?: number;
  after?: string;
  query?: string;
  sortKey?: 'TITLE' | 'PRICE' | 'BEST_SELLING' | 'CREATED' | 'RELEVANCE';
  reverse?: boolean;
}): Promise<ProductConnection> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query GetProducts(
      $first: Int!
      $after: String
      $query: String
      $sortKey: ProductSortKeys
      $reverse: Boolean
    ) {
      products(
        first: $first
        after: $after
        query: $query
        sortKey: $sortKey
        reverse: $reverse
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            ...ProductFields
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<{ products: ProductConnection }>({
    query,
    variables: { first, after, query: searchQuery, sortKey, reverse },
    cache: 'no-store', // Dynamic content
  });

  return data.products;
}

// Search products
export async function searchProducts(searchTerm: string, limit = 10): Promise<Product[]> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query SearchProducts($query: String!, $first: Int!) {
      search(query: $query, first: $first, types: [PRODUCT]) {
        edges {
          node {
            ... on Product {
              ...ProductFields
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<{ search: { edges: { node: Product }[] } }>({
    query,
    variables: { query: searchTerm, first: limit },
    cache: 'no-store',
  });

  return data.search.edges.map(edge => edge.node);
}

// Get product recommendations
export async function getProductRecommendations(productId: string): Promise<Product[]> {
  const query = `
    ${PRODUCT_FRAGMENT}
    query GetRecommendations($productId: ID!) {
      productRecommendations(productId: $productId) {
        ...ProductFields
      }
    }
  `;

  const data = await shopifyFetch<{ productRecommendations: Product[] }>({
    query,
    variables: { productId },
    tags: [`recommendations-${productId}`],
  });

  return data.productRecommendations || [];
}
```

### 2.4 Collection/Category Handling

```typescript
// lib/shopify/collections.ts
import { shopifyFetch } from './client';
import type { Collection, CollectionConnection } from './types';

const COLLECTION_FRAGMENT = `
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    descriptionHtml
    image {
      url
      altText
      width
      height
    }
    seo {
      title
      description
    }
  }
`;

// Get all collections
export async function getCollections(): Promise<Collection[]> {
  const query = `
    ${COLLECTION_FRAGMENT}
    query GetCollections {
      collections(first: 100) {
        edges {
          node {
            ...CollectionFields
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<{ collections: CollectionConnection }>({
    query,
    tags: ['collections'],
  });

  return data.collections.edges.map(edge => edge.node);
}

// Get collection with products
export async function getCollectionWithProducts(
  handle: string,
  {
    first = 20,
    after,
    sortKey = 'COLLECTION_DEFAULT',
    reverse = false,
    filters = [],
  }: {
    first?: number;
    after?: string;
    sortKey?: 'TITLE' | 'PRICE' | 'BEST_SELLING' | 'CREATED' | 'COLLECTION_DEFAULT';
    reverse?: boolean;
    filters?: Array<{ productType?: string; price?: { min?: number; max?: number } }>;
  } = {}
): Promise<Collection & { products: ProductConnection }> {
  const query = `
    ${COLLECTION_FRAGMENT}
    ${PRODUCT_FRAGMENT}
    query GetCollectionWithProducts(
      $handle: String!
      $first: Int!
      $after: String
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean
      $filters: [ProductFilter!]
    ) {
      collection(handle: $handle) {
        ...CollectionFields
        products(
          first: $first
          after: $after
          sortKey: $sortKey
          reverse: $reverse
          filters: $filters
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          filters {
            id
            label
            type
            values {
              id
              label
              count
              input
            }
          }
          edges {
            node {
              ...ProductFields
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<{ collection: Collection & { products: ProductConnection } }>({
    query,
    variables: { handle, first, after, sortKey, reverse, filters },
    tags: [`collection-${handle}`],
  });

  return data.collection;
}
```

### 2.5 Cart API Implementation

```typescript
// lib/shopify/cart.ts
import { shopifyFetch } from './client';
import type { Cart, CartLineInput, CartLineUpdateInput } from './types';

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              image {
                url
                altText
              }
              price {
                amount
                currencyCode
              }
              product {
                id
                title
                handle
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    buyerIdentity {
      email
      phone
      customer {
        id
      }
    }
    attributes {
      key
      value
    }
  }
`;

// Create a new cart
export async function createCart(lines?: CartLineInput[]): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartCreate: { cart: Cart; userErrors: Array<{ field: string[]; message: string }> };
  }>({
    query,
    variables: {
      input: {
        lines: lines || [],
      },
    },
    cache: 'no-store',
  });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map(e => e.message).join(', '));
  }

  return data.cartCreate.cart;
}

// Get existing cart
export async function getCart(cartId: string): Promise<Cart | null> {
  const query = `
    ${CART_FRAGMENT}
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        ...CartFields
      }
    }
  `;

  const data = await shopifyFetch<{ cart: Cart | null }>({
    query,
    variables: { cartId },
    cache: 'no-store',
  });

  return data.cart;
}

// Add lines to cart
export async function addToCart(cartId: string, lines: CartLineInput[]): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesAdd: { cart: Cart; userErrors: Array<{ field: string[]; message: string }> };
  }>({
    query,
    variables: { cartId, lines },
    cache: 'no-store',
  });

  if (data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors.map(e => e.message).join(', '));
  }

  return data.cartLinesAdd.cart;
}

// Update cart lines
export async function updateCartLines(
  cartId: string,
  lines: CartLineUpdateInput[]
): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: Cart; userErrors: Array<{ field: string[]; message: string }> };
  }>({
    query,
    variables: { cartId, lines },
    cache: 'no-store',
  });

  if (data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors.map(e => e.message).join(', '));
  }

  return data.cartLinesUpdate.cart;
}

// Remove lines from cart
export async function removeFromCart(cartId: string, lineIds: string[]): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesRemove: { cart: Cart; userErrors: Array<{ field: string[]; message: string }> };
  }>({
    query,
    variables: { cartId, lineIds },
    cache: 'no-store',
  });

  if (data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors.map(e => e.message).join(', '));
  }

  return data.cartLinesRemove.cart;
}

// Update buyer identity (for logged-in users)
export async function updateCartBuyerIdentity(
  cartId: string,
  buyerIdentity: {
    email?: string;
    phone?: string;
    customerAccessToken?: string;
  }
): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          ...CartFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartBuyerIdentityUpdate: { cart: Cart; userErrors: Array<{ field: string[]; message: string }> };
  }>({
    query,
    variables: { cartId, buyerIdentity },
    cache: 'no-store',
  });

  return data.cartBuyerIdentityUpdate.cart;
}
```

### 2.6 Cart Hook with Zustand

```typescript
// stores/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  createCart, 
  getCart, 
  addToCart, 
  updateCartLines, 
  removeFromCart 
} from '@/lib/shopify/cart';
import type { Cart, CartLineInput } from '@/lib/shopify/types';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isOpen: boolean;
  
  // Actions
  openCart: () => void;
  closeCart: () => void;
  initializeCart: () => Promise<void>;
  addItem: (line: CartLineInput) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      initializeCart: async () => {
        const { cart } = get();
        
        if (cart?.id) {
          // Try to fetch existing cart
          set({ isLoading: true });
          try {
            const existingCart = await getCart(cart.id);
            if (existingCart) {
              set({ cart: existingCart, isLoading: false });
              return;
            }
          } catch (error) {
            console.error('Failed to fetch cart:', error);
          }
        }
        
        // Create new cart if none exists
        set({ isLoading: true });
        try {
          const newCart = await createCart();
          set({ cart: newCart, isLoading: false });
        } catch (error) {
          console.error('Failed to create cart:', error);
          set({ isLoading: false });
        }
      },

      addItem: async (line: CartLineInput) => {
        const { cart, initializeCart } = get();
        
        if (!cart?.id) {
          await initializeCart();
        }
        
        const currentCart = get().cart;
        if (!currentCart?.id) return;

        set({ isLoading: true });
        try {
          const updatedCart = await addToCart(currentCart.id, [line]);
          set({ cart: updatedCart, isLoading: false, isOpen: true });
        } catch (error) {
          console.error('Failed to add item:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateItem: async (lineId: string, quantity: number) => {
        const { cart } = get();
        if (!cart?.id) return;

        set({ isLoading: true });
        try {
          if (quantity === 0) {
            const updatedCart = await removeFromCart(cart.id, [lineId]);
            set({ cart: updatedCart, isLoading: false });
          } else {
            const updatedCart = await updateCartLines(cart.id, [{ id: lineId, quantity }]);
            set({ cart: updatedCart, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to update item:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      removeItem: async (lineId: string) => {
        const { cart } = get();
        if (!cart?.id) return;

        set({ isLoading: true });
        try {
          const updatedCart = await removeFromCart(cart.id, [lineId]);
          set({ cart: updatedCart, isLoading: false });
        } catch (error) {
          console.error('Failed to remove item:', error);
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cart: state.cart ? { id: state.cart.id } : null }),
    }
  )
);

// Hook for components
export function useCart() {
  const store = useCartStore();
  
  return {
    cart: store.cart,
    isLoading: store.isLoading,
    isOpen: store.isOpen,
    itemCount: store.cart?.totalQuantity ?? 0,
    subtotal: store.cart?.cost?.subtotalAmount?.amount ?? '0',
    total: store.cart?.cost?.totalAmount?.amount ?? '0',
    
    openCart: store.openCart,
    closeCart: store.closeCart,
    addItem: store.addItem,
    updateItem: store.updateItem,
    removeItem: store.removeItem,
    
    // Computed
    isEmpty: !store.cart?.lines?.edges?.length,
    lines: store.cart?.lines?.edges?.map(e => e.node) ?? [],
  };
}
```

### 2.7 Inventory and Variant Management

```typescript
// lib/shopify/inventory.ts
import { shopifyFetch } from './client';

// Check variant availability
export async function checkVariantAvailability(variantId: string): Promise<{
  available: boolean;
  quantityAvailable: number;
}> {
  const query = `
    query CheckAvailability($id: ID!) {
      node(id: $id) {
        ... on ProductVariant {
          availableForSale
          quantityAvailable
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    node: { availableForSale: boolean; quantityAvailable: number };
  }>({
    query,
    variables: { id: variantId },
    cache: 'no-store',
  });

  return {
    available: data.node.availableForSale,
    quantityAvailable: data.node.quantityAvailable,
  };
}

// Get variant by selected options
export function findVariantByOptions(
  variants: Array<{
    id: string;
    selectedOptions: Array<{ name: string; value: string }>;
  }>,
  selectedOptions: Record<string, string>
): string | null {
  const variant = variants.find((v) =>
    v.selectedOptions.every(
      (opt) => selectedOptions[opt.name] === opt.value
    )
  );
  return variant?.id ?? null;
}

// Variant selector component logic
export function useVariantSelector(product: Product) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    // Initialize with first available variant's options
    const firstVariant = product.variants.edges[0]?.node;
    if (!firstVariant) return {};
    
    return firstVariant.selectedOptions.reduce((acc, opt) => {
      acc[opt.name] = opt.value;
      return acc;
    }, {} as Record<string, string>);
  });

  const selectedVariant = useMemo(() => {
    const variantId = findVariantByOptions(
      product.variants.edges.map(e => e.node),
      selectedOptions
    );
    return product.variants.edges.find(e => e.node.id === variantId)?.node ?? null;
  }, [product.variants, selectedOptions]);

  const updateOption = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  // Get available options based on current selection
  const availableOptions = useMemo(() => {
    const available: Record<string, Set<string>> = {};
    
    product.options.forEach(option => {
      available[option.name] = new Set();
      
      product.variants.edges.forEach(({ node: variant }) => {
        if (!variant.availableForSale) return;
        
        // Check if this variant matches all other selected options
        const matchesOtherOptions = variant.selectedOptions.every(opt => {
          if (opt.name === option.name) return true;
          return selectedOptions[opt.name] === opt.value;
        });
        
        if (matchesOtherOptions) {
          const optionValue = variant.selectedOptions.find(o => o.name === option.name)?.value;
          if (optionValue) available[option.name].add(optionValue);
        }
      });
    });
    
    return available;
  }, [product, selectedOptions]);

  return {
    selectedOptions,
    selectedVariant,
    updateOption,
    availableOptions,
    options: product.options,
  };
}
```

### 2.8 Webhook Handling

```typescript
// app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase/admin';

initAdmin();

const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

// Verify Shopify webhook signature
function verifyWebhook(body: string, hmac: string): boolean {
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
  const topic = request.headers.get('X-Shopify-Topic');
  const shopDomain = request.headers.get('X-Shopify-Shop-Domain');

  // Verify signature
  if (!hmac || !verifyWebhook(body, hmac)) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const db = getFirestore();

  try {
    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(db, payload, shopDomain!);
        break;
      
      case 'orders/updated':
        await handleOrderUpdated(db, payload, shopDomain!);
        break;
      
      case 'orders/fulfilled':
        await handleOrderFulfilled(db, payload, shopDomain!);
        break;
      
      case 'orders/cancelled':
        await handleOrderCancelled(db, payload, shopDomain!);
        break;
      
      case 'inventory_levels/update':
        await handleInventoryUpdate(db, payload, shopDomain!);
        break;
      
      case 'products/update':
        await handleProductUpdate(db, payload, shopDomain!);
        break;
      
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleOrderCreated(
  db: FirebaseFirestore.Firestore,
  order: ShopifyOrder,
  shopDomain: string
) {
  const clientId = getClientIdFromDomain(shopDomain);
  
  // Store order in Firestore
  await db.collection(`clients/${clientId}/orders`).doc(order.id.toString()).set({
    shopifyOrderId: order.id,
    orderNumber: order.order_number,
    email: order.email,
    totalPrice: order.total_price,
    currency: order.currency,
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    lineItems: order.line_items.map(item => ({
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: order.shipping_address,
    billingAddress: order.billing_address,
    createdAt: new Date(order.created_at),
    updatedAt: new Date(),
  });

  // Trigger any post-order processing (e.g., digital product delivery)
  const hasDigitalProducts = order.line_items.some(item => 
    item.properties?.some(p => p.name === '_digital_product')
  );
  
  if (hasDigitalProducts) {
    await triggerDigitalDelivery(db, clientId, order);
  }
}

async function handleOrderFulfilled(
  db: FirebaseFirestore.Firestore,
  order: ShopifyOrder,
  shopDomain: string
) {
  const clientId = getClientIdFromDomain(shopDomain);
  
  await db.collection(`clients/${clientId}/orders`).doc(order.id.toString()).update({
    fulfillmentStatus: 'fulfilled',
    fulfilledAt: new Date(),
    updatedAt: new Date(),
  });

  // Send fulfillment notification
  await sendFulfillmentEmail(order.email, order);
}

async function handleInventoryUpdate(
  db: FirebaseFirestore.Firestore,
  inventoryLevel: ShopifyInventoryLevel,
  shopDomain: string
) {
  const clientId = getClientIdFromDomain(shopDomain);
  
  // Update inventory cache if needed
  await db.collection(`clients/${clientId}/inventory_cache`).doc(inventoryLevel.inventory_item_id.toString()).set({
    available: inventoryLevel.available,
    updatedAt: new Date(),
  }, { merge: true });

  // Check for low stock alerts
  if (inventoryLevel.available <= 5) {
    await createLowStockAlert(db, clientId, inventoryLevel);
  }
}

// Helper to map shop domain to client ID
function getClientIdFromDomain(shopDomain: string): string {
  // In production, this would look up the client ID from a mapping
  // For now, derive from domain
  return shopDomain.replace('.myshopify.com', '');
}
```

### 2.9 Caching Strategies with TanStack Query

```typescript
// hooks/useProducts.ts
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProduct, getProducts, searchProducts, getProductRecommendations } from '@/lib/shopify/queries';
import { getCollectionWithProducts } from '@/lib/shopify/collections';

// Query key factory for consistent cache management
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (handle: string) => [...productKeys.details(), handle] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
  recommendations: (productId: string) => [...productKeys.all, 'recommendations', productId] as const,
};

export const collectionKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  detail: (handle: string, filters?: Record<string, unknown>) => 
    [...collectionKeys.all, 'detail', handle, filters] as const,
};

// Single product query
export function useProduct(handle: string) {
  return useQuery({
    queryKey: productKeys.detail(handle),
    queryFn: () => getProduct(handle),
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache retention
    enabled: !!handle,
  });
}

// Product list with infinite scroll
export function useProductsInfinite(filters: { query?: string; sortKey?: string } = {}) {
  return useInfiniteQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ pageParam }) => getProducts({
      first: 20,
      after: pageParam,
      query: filters.query,
      sortKey: filters.sortKey as any,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => 
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// Collection with products
export function useCollection(
  handle: string,
  options: {
    sortKey?: string;
    filters?: Array<{ productType?: string }>;
  } = {}
) {
  return useInfiniteQuery({
    queryKey: collectionKeys.detail(handle, options),
    queryFn: ({ pageParam }) => getCollectionWithProducts(handle, {
      first: 20,
      after: pageParam,
      sortKey: options.sortKey as any,
      filters: options.filters,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.products.pageInfo.hasNextPage 
        ? lastPage.products.pageInfo.endCursor 
        : undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!handle,
  });
}

// Search with debounce
export function useProductSearch(query: string) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => searchProducts(query),
    staleTime: 30 * 1000, // 30 seconds - search results can change
    gcTime: 5 * 60 * 1000,
    enabled: query.length >= 2, // Only search with 2+ characters
  });
}

// Product recommendations
export function useProductRecommendations(productId: string) {
  return useQuery({
    queryKey: productKeys.recommendations(productId),
    queryFn: () => getProductRecommendations(productId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    enabled: !!productId,
  });
}

// Prefetch product on hover (for faster navigation)
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  
  return (handle: string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(handle),
      queryFn: () => getProduct(handle),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Invalidate product cache (after admin updates)
export function useInvalidateProducts() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
    invalidateProduct: (handle: string) => 
      queryClient.invalidateQueries({ queryKey: productKeys.detail(handle) }),
    invalidateCollection: (handle: string) =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(handle) }),
  };
}
```

```typescript
// Example usage in component
// components/shop/ProductGrid.tsx
'use client';

import { useProductsInfinite, usePrefetchProduct } from '@/hooks/useProducts';
import { ProductCard } from './ProductCard';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function ProductGrid({ initialQuery }: { initialQuery?: string }) {
  const { ref, inView } = useInView();
  const prefetchProduct = usePrefetchProduct();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useProductsInfinite({ query: initialQuery });

  // Auto-fetch next page when scrolling
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <ProductGridSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  const products = data?.pages.flatMap(page => page.edges.map(e => e.node)) ?? [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onMouseEnter={() => prefetchProduct(product.handle)}
        />
      ))}
      
      {/* Infinite scroll trigger */}
      <div ref={ref} className="col-span-full">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  );
}
```

---

## Appendix: Quick Reference

### Environment Variables Checklist

```bash
# Required for all deployments
NEXT_PUBLIC_FIREBASE_API_KEY=✓
NEXT_PUBLIC_FIREBASE_PROJECT_ID=✓
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=✓
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=✓

# Required for server-side
FIREBASE_SERVICE_ACCOUNT_KEY=✓
SHOPIFY_WEBHOOK_SECRET=✓

# Optional based on features
STRIPE_SECRET_KEY=if using Stripe
VIVA_WALLET_API_KEY=if using Viva
AADE_USER_ID=if Greek client
```

### Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "firebase": "^10.7.0",
    "reactfire": "^4.2.3",
    "@shopify/storefront-api-client": "^0.3.0",
    "@shopify/hydrogen-react": "^2024.1.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "zod": "^3.22.4",
    "ai": "^2.2.0"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^5.0.0",
    "@graphql-codegen/typescript": "^4.0.0",
    "@graphql-codegen/typescript-operations": "^4.0.0"
  }
}
```

### Common Patterns Summary

| Pattern | When to Use |
|---------|-------------|
| Server Component | SEO-critical pages, initial data fetch |
| Client Component | User interaction, real-time data |
| TanStack Query | Server state caching, pagination |
| Zustand | Client state (cart, UI) |
| Firebase Callable | Authenticated business logic |
| API Routes | Webhooks, external callbacks |
