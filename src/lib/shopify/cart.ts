
import { shopifyFetch } from './client';
import {
    createCartMutation,
    addToCartMutation,
    removeFromCartMutation,
    updateCartLinesMutation,
    updateCartBuyerIdentityMutation,
    updateCartSelectedDeliveryOptionsMutation
} from './mutations';
import { getCartQuery } from './queries';
import { Cart } from './types';

export async function createCart(): Promise<Cart> {
    const res = await shopifyFetch<{ cartCreate: { cart: Cart } }>(createCartMutation);
    return res.cartCreate.cart;
}

export async function addToCart(cartId: string, lines: { merchandiseId: string; quantity: number }[]): Promise<Cart> {
    const res = await shopifyFetch<{ cartLinesAdd: { cart: Cart } }>(addToCartMutation, {
        cartId,
        lines,
    });
    return res.cartLinesAdd.cart;
}

export async function removeFromCart(cartId: string, lineIds: string[]): Promise<Cart> {
    const res = await shopifyFetch<{ cartLinesRemove: { cart: Cart } }>(removeFromCartMutation, {
        cartId,
        lineIds,
    });
    return res.cartLinesRemove.cart;
}

export async function updateCart(cartId: string, lines: { id: string; merchandiseId?: string; quantity: number }[]): Promise<Cart> {
    const res = await shopifyFetch<{ cartLinesUpdate: { cart: Cart } }>(updateCartLinesMutation, {
        cartId,
        lines,
    });
    return res.cartLinesUpdate.cart;
}

export async function updateCartBuyerIdentity(cartId: string, buyerIdentity: { email?: string; countryCode?: string }): Promise<Cart> {
    const res = await shopifyFetch<{ cartBuyerIdentityUpdate: { cart: Cart } }>(updateCartBuyerIdentityMutation, {
        cartId,
        buyerIdentity,
    });
    return res.cartBuyerIdentityUpdate.cart;
}

export async function updateCartSelectedDeliveryOptions(cartId: string, selectedDeliveryOptions: { deliveryGroupId: string; deliveryOptionHandle: string }[]): Promise<Cart> {
    const res = await shopifyFetch<{ cartSelectedDeliveryOptionsUpdate: { cart: Cart } }>(updateCartSelectedDeliveryOptionsMutation, {
        cartId,
        selectedDeliveryOptions,
    });
    return res.cartSelectedDeliveryOptionsUpdate.cart;
}

export async function getCart(cartId: string): Promise<Cart | undefined> {
    const res = await shopifyFetch<{ cart: Cart }>(getCartQuery, { cartId });
    return res.cart;
}
