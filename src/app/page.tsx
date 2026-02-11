import { getProducts } from '@/lib/shopify/client';
import { ProductGrid } from '@/components/product/product-grid';

export const metadata = {
  description: 'High-performance ecommerce store built with Next.js, Vercel, and Shopify.',
  openGraph: {
    type: 'website'
  }
};

export default async function Home() {
  const products = await getProducts({ sortKey: 'CREATED_AT', reverse: true });

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden pt-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Welcome to Our Store
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Discover our latest collection of premium products.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a href="/admin/drafts" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Manage Store (Admin)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Latest Arrivals</h2>
        </div>
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
