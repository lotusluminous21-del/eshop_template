
'use client';

import { useCart } from '@/providers/CartProvider';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
    const { cart, removeCartItem, updateCartItem } = useCart();

    if (!cart || cart.lines.edges.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Your Cart</h1>
                <p className="mb-8">Your cart is empty.</p>
                <Link href="/products" className="bg-black text-white px-6 py-3 rounded">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    {cart.lines.edges.map(({ node: line }) => (
                        <div key={line.id} className="flex gap-4 border p-4 rounded-lg items-center">
                            <div className="relative w-20 h-20 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                {line.merchandise.image && (
                                    <Image
                                        src={line.merchandise.image.url}
                                        alt={line.merchandise.image.altText || line.merchandise.title}
                                        fill
                                        className="object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-semibold">{line.merchandise.product.title}</h3>
                                <p className="text-sm text-neutral-600">{line.merchandise.title} (Variant)</p>
                                <div className="mt-2 text-sm text-neutral-600">
                                    {line.merchandise.price.amount} {line.merchandise.price.currencyCode}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateCartItem(line.id, line.quantity - 1)}
                                    className="px-2 py-1 border rounded hover:bg-neutral-100"
                                    disabled={line.quantity <= 1}
                                >
                                    -
                                </button>
                                <span className="w-8 text-center">{line.quantity}</span>
                                <button
                                    onClick={() => updateCartItem(line.id, line.quantity + 1)}
                                    className="px-2 py-1 border rounded hover:bg-neutral-100"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={() => removeCartItem(line.id)}
                                className="text-red-600 hover:text-red-800 ml-4"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <div className="border p-6 rounded-lg h-fit">
                    <h2 className="text-xl font-bold mb-4">Summary</h2>
                    <div className="flex justify-between mb-4">
                        <span>Subtotal</span>
                        <span>{cart.cost.subtotalAmount.amount} {cart.cost.subtotalAmount.currencyCode}</span>
                    </div>
                    <div className="flex justify-between mb-4">
                        <span>Tax</span>
                        <span>{cart.cost.totalTaxAmount ? `${cart.cost.totalTaxAmount.amount} ${cart.cost.totalTaxAmount.currencyCode}` : 'Calculated at checkout'}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between font-bold mb-6">
                        <span>Total</span>
                        <span>{cart.cost.totalAmount.amount} {cart.cost.totalAmount.currencyCode}</span>
                    </div>
                    <a
                        href={cart.checkoutUrl}
                        className="block w-full bg-black text-white text-center py-3 rounded hover:bg-neutral-800 transition-colors"
                    >
                        Proceed to Checkout
                    </a>
                </div>
            </div>
        </div>
    );
}
