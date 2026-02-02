
import { getProduct } from '@/lib/shopify/client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import AddToCart from '@/components/product/AddToCart';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
    const product = await getProduct(params.handle);

    if (!product) {
        return {
            title: 'Product Not Found',
        };
    }

    return {
        title: product.seo.title || product.title,
        description: product.seo.description || product.description,
    };
}

export default async function ProductPage({ params }: { params: { handle: string } }) {
    const product = await getProduct(params.handle);

    if (!product) {
        return notFound();
    }

    const variants = product.variants.edges.map(e => e.node);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gallery */}
                <div className="space-y-4">
                    <div className="aspect-square relative overflow-hidden bg-neutral-100 rounded-lg">
                        {product.featuredImage && (
                            <Image
                                src={product.featuredImage.url}
                                alt={product.featuredImage.altText || product.title}
                                fill
                                className="object-cover object-center"
                                sizes="(min-width: 768px) 50vw, 100vw"
                                priority
                            />
                        )}
                    </div>
                </div>

                {/* Product Info */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">{product.title}</h1>
                    <div className="text-xl font-medium mb-4">
                        {product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
                    </div>

                    <div className="prose prose-sm mb-8" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />

                    {/* Variants & Add to Cart */}
                    <div className="border-t pt-6 mt-6">
                        <AddToCart variants={variants} />
                    </div>
                </div>
            </div>
        </div>
    );
}
