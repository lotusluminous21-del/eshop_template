
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { getCart, createCart, addToCart, removeFromCart, updateCart, updateCartSelectedDeliveryOptions } from '@/lib/shopify/cart';
import { Cart } from '@/lib/shopify/types';
import Cookies from 'js-cookie';

type CartContextType = {
    cart: Cart | undefined;
    addCartItem: (variantId: string, quantity?: number) => Promise<void>;
    removeCartItem: (lineId: string) => Promise<void>;
    updateCartItem: (lineId: string, quantity: number) => Promise<void>;
    updateCartDelivery: (deliveryGroupId: string, deliveryOptionHandle: string) => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<Cart | undefined>(undefined);

    useEffect(() => {
        const initializeCart = async () => {
            const cartId = Cookies.get('cartId');
            if (cartId) {
                try {
                    const existingCart = await getCart(cartId);
                    if (existingCart) {
                        setCart(existingCart);
                    }
                } catch (e) {
                    console.error("Failed to load cart", e);
                }
            }
        };

        initializeCart();
    }, []);

    const addCartItem = useCallback(async (variantId: string, quantity: number = 1) => {
        let currentCartId = cart?.id;

        if (!currentCartId) {
            const cartIdCookie = Cookies.get('cartId');
            if (cartIdCookie) {
                currentCartId = cartIdCookie;
            } else {
                const newCart = await createCart();
                currentCartId = newCart.id;
                Cookies.set('cartId', currentCartId);
                setCart(newCart);
            }
        }

        if (!currentCartId) return;

        const updatedCart = await addToCart(currentCartId, [{ merchandiseId: variantId, quantity }]);
        setCart(updatedCart);
    }, [cart]);

    const removeCartItem = useCallback(async (lineId: string) => {
        if (!cart?.id) return;
        const updatedCart = await removeFromCart(cart.id, [lineId]);
        setCart(updatedCart);
    }, [cart]);

    const updateCartItem = useCallback(async (lineId: string, quantity: number) => {
        if (!cart?.id) return;
        if (quantity === 0) {
            const updatedCart = await removeFromCart(cart.id, [lineId]);
            setCart(updatedCart);
            return;
        }
        const updatedCart = await updateCart(cart.id, [{ id: lineId, quantity }]);
        setCart(updatedCart);
    }, [cart]);

    const updateCartDelivery = useCallback(async (deliveryGroupId: string, deliveryOptionHandle: string) => {
        if (!cart?.id) return;
        const updatedCart = await updateCartSelectedDeliveryOptions(cart.id, [{ deliveryGroupId, deliveryOptionHandle }]);
        setCart(updatedCart);
    }, [cart]);

    const value = useMemo(() => ({
        cart,
        addCartItem,
        removeCartItem,
        updateCartItem,
        updateCartDelivery
    }), [cart, addCartItem, removeCartItem, updateCartItem, updateCartDelivery]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
