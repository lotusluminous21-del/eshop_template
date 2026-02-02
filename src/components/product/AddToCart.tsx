
'use client';

import { useState } from 'react';
import { useCart } from '@/providers/CartProvider';
import { ProductVariant } from '@/lib/shopify/types';

export default function AddToCart({ variants }: { variants: ProductVariant[] }) {
    const { addCartItem } = useCart();
    const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');
    const [isAdding, setIsAdding] = useState(false);

    // Simple variant selector logic for now (just a dropdown of all variants)
    // In a real app, this would be a sophisticated selector based on options (Size, Color)

    const handleAddToCart = async () => {
        if (!selectedVariantId) return;
        setIsAdding(true);
        try {
            await addCartItem(selectedVariantId, 1);
            alert('Added to cart!'); // Minimal feedback
        } catch (e) {
            console.error(e);
            alert('Failed to add to cart');
        } finally {
            setIsAdding(false);
        }
    };

    if (!variants.length) return <div>Out of Stock</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <label htmlFor="variant-select" className="text-sm font-medium">Select Variant</label>
                <select
                    id="variant-select"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="border p-2 rounded"
                >
                    {variants.map(v => (
                        <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                            {v.title} - {v.price.amount} {v.price.currencyCode} {!v.availableForSale && '(Out of Stock)'}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleAddToCart}
                disabled={isAdding || !selectedVariantId}
                className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
            >
                {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
        </div>
    );
}
