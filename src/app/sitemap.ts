import { MetadataRoute } from 'next';
import { getCollections, getProducts } from '@/lib/shopify/client';
import { env } from '@/lib/env';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Fetch dynamic routes
    const productsPromise = getProducts({});
    const collectionsPromise = getCollections();

    const [products, collections] = await Promise.all([
        productsPromise,
        collectionsPromise,
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${baseUrl}/product/${product.handle}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    const collectionEntries: MetadataRoute.Sitemap = collections.map((collection) => ({
        url: `${baseUrl}/search/${collection.handle}`,
        lastModified: collection.updatedAt ? new Date(collection.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // Static routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/about`, // Assuming these exist or will exist
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];

    return [...staticRoutes, ...productEntries, ...collectionEntries];
}
