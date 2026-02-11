import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/shopify/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

interface ProductGridProps {
    products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
    if (products.length === 0) {
        return (
            <div className="flex h-96 flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold tracking-tight">No products found</h2>
                <p className="mt-2 text-muted-foreground">
                    We couldn't find any products in your store.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
                <Link key={product.id} href={`/product/${product.handle}`} className="group">
                    <Card className="h-full overflow-hidden border-0 bg-transparent shadow-none">
                        <CardContent className="p-0">
                            <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/20">
                                {product.featuredImage ? (
                                    <Image
                                        src={product.featuredImage.url}
                                        alt={product.featuredImage.altText || product.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                                        <span className="text-muted-foreground">No Image</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start p-4">
                            <h3 className="text-lg font-medium text-foreground">{product.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {parseInt(product.priceRange.minVariantPrice.amount) === 0 ? "Free" :
                                    new Intl.NumberFormat(undefined, {
                                        style: 'currency',
                                        currency: product.priceRange.minVariantPrice.currencyCode,
                                    }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                            </p>
                        </CardFooter>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
