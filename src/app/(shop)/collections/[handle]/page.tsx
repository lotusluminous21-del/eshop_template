
import { getCollection } from '@/lib/shopify/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function CollectionPage({ params }: { params: { handle: string } }) {
    const collection = await getCollection(params.handle);

    if (!collection) {
        return notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">{collection.title}</h1>
            <p className="text-neutral-600 mb-8 max-w-2xl">{collection.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {collection.products.edges.map(({ node: product }) => (
                    <Link
                        key={product.id}
                        href={`/products/${product.handle}`}
                        className="group block"
                    >
                        <div className="aspect-square relative overflow-hidden bg-neutral-100 rounded-md mb-4">
                            {product.featuredImage ? (
                                <Image
                                    src={product.featuredImage.url}
                                    alt={product.featuredImage.altText || product.title}
                                    fill
                                    className="object-cover object-center group-hover:scale-105 transition-transform"
                                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                    No Image
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold">{product.title}</h3>
                        <div className="mt-1 text-sm text-neutral-600">
                            {product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
