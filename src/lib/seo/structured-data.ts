import { WithContext, Product, Organization, BreadcrumbList } from 'schema-dts';
import { env } from '@/lib/env';

export function constructOrganizationSchema(): WithContext<Organization> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: env.NEXT_PUBLIC_SITE_NAME || 'E-Shop',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        sameAs: [
            // Add social links here if available in config
            'https://twitter.com/yourhandle',
        ],
    };
}

export function constructProductSchema(product: {
    title: string;
    description: string;
    images: { url: string }[];
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    handle: string;
}): WithContext<Product> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description,
        image: product.images.map((img) => img.url),
        offers: {
            '@type': 'Offer',
            price: product.priceRange.minVariantPrice.amount,
            priceCurrency: product.priceRange.minVariantPrice.currencyCode,
            availability: 'https://schema.org/InStock',
            url: `${baseUrl}/products/${product.handle}`,
        },
    };
}

export function constructBreadcrumbSchema(
    items: { name: string; item: string }[]
): WithContext<BreadcrumbList> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.item.startsWith('http') ? item.item : `${baseUrl}${item.item}`,
        })),
    };
}
