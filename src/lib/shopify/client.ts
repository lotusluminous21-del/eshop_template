
import { createStorefrontApiClient } from '@shopify/storefront-api-client';
import { env } from '@/lib/env';
import {
    getProductsQuery,
    getProductByHandleQuery,
    getCollectionQuery,
    getCollectionsQuery
} from './queries';
import {
    Product,
    Collection,
    Connection
} from './types';

export const shopifyClient = createStorefrontApiClient({
    storeDomain: env.SHOPIFY_STORE_DOMAIN,
    apiVersion: '2024-01',
    publicAccessToken: env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
});

export async function shopifyFetch<T>(query: string, variables?: Record<string, string | number | boolean | null | undefined | object>): Promise<T> {
    const response = await shopifyClient.request(query, { variables });

    if (response.errors) {
        const errorMessage = response.errors.graphQLErrors
            ? response.errors.graphQLErrors.map((e: { message: string }) => e.message).join(', ')
            : response.errors.message || 'Unknown error';
        throw new Error(errorMessage);
    }

    return response.data as T;
}

export async function getProducts({
    query,
    reverse,
    sortKey
}: {
    query?: string;
    reverse?: boolean;
    sortKey?: string;
} = {}): Promise<Product[]> {
    const res = await shopifyFetch<{ products: Connection<Product> }>(getProductsQuery, {
        first: 100,
        query,
        reverse,
        sortKey,
    });

    return res.products.edges.map((edge) => edge.node);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
    const res = await shopifyFetch<{ product: Product }>(getProductByHandleQuery, { handle });
    return res.product;
}

export async function getCollection(handle: string): Promise<Collection | undefined> {
    const res = await shopifyFetch<{ collection: Collection }>(getCollectionQuery, { handle });
    return res.collection;
}

export async function getCollections(): Promise<Collection[]> {
    const res = await shopifyFetch<{ collections: Connection<Collection> }>(getCollectionsQuery);
    return res.collections.edges.map((edge) => edge.node);
}
