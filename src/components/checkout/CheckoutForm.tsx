
'use client';

import { useState } from 'react';
import { updateCartBuyerIdentity } from '@/lib/shopify/cart';
import { useCart } from '@/providers/CartProvider';

export default function CheckoutForm() {
    const { cart, updateCartDelivery } = useCart();
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState({
        firstName: '',
        lastName: '',
        address1: '',
        city: '',
        countryCode: 'GR', // Default to Greece
        zip: '',
        phone: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // 1. Update Identity & Address to get shipping rates
    const handleUpdateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cart?.id) return;

        setLoading(true);
        setMessage('');
        try {
            // Note: Passing address requires a more complex input type in mutations.
            // For this refined phase, we stick to email + country logic or explicit buyerIdentity update.
            // Since the mock function in cart.ts currently only accepts email/country, let's assume we proceed with that for rates.
            // In a full implementation, we'd update the full address. 
            await updateCartBuyerIdentity(cart.id, {
                email,
                countryCode: address.countryCode
            });
            setMessage('Address updated! Please select shipping.');
        } catch (err) {
            console.error(err);
            setMessage('Error updating address');
        } finally {
            setLoading(false);
        }
    };

    // 2. Proceed to checkout
    const handleCheckout = () => {
        if (!cart?.checkoutUrl) return;
        window.location.href = cart.checkoutUrl;
    };

    if (!cart) return null;

    return (
        <div className="border p-6 rounded-lg max-w-md mx-auto space-y-6">
            <h2 className="text-xl font-bold">Checkout</h2>

            {/* Step 1: Contact Info */}
            <form onSubmit={handleUpdateAddress} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        required
                        className="w-full border px-3 py-2 rounded"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Country</label>
                        <select
                            className="w-full border px-3 py-2 rounded"
                            value={address.countryCode}
                            onChange={(e) => setAddress({ ...address, countryCode: e.target.value })}
                        >
                            <option value="GR">Greece</option>
                            <option value="US">United States</option>
                            {/* Add full list as needed */}
                        </select>
                    </div>
                    {/* In a real app, we'd gather all address fields. Listing a few for UI completion */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Postal Code</label>
                        <input
                            type="text"
                            className="w-full border px-3 py-2 rounded"
                            placeholder="12345"
                            value={address.zip}
                            onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-100 text-black border py-2 rounded hover:bg-neutral-200"
                >
                    {loading ? 'Updating...' : 'Calculate Shipping'}
                </button>
            </form>

            {message && <p className="text-sm text-green-600">{message}</p>}

            {/* Step 2: Shipping Options */}
            {cart.deliveryGroups?.edges?.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Shipping Method</h3>
                    {cart.deliveryGroups.edges.map(({ node: group }) => (
                        <div key={group.id} className="space-y-2">
                            {group.deliveryOptions.map((option) => (
                                <div key={option.handle} className="flex items-center gap-2 border p-3 rounded cursor-pointer hover:bg-neutral-50"
                                    onClick={() => updateCartDelivery(group.id, option.handle)}>
                                    <input
                                        type="radio"
                                        name={`group-${group.id}`}
                                        checked={group.selectedDeliveryOption?.handle === option.handle}
                                        readOnly
                                    />
                                    <div className="flex-grow">
                                        <span className="font-medium">{option.title}</span> - {option.estimatedCost.amount} {option.estimatedCost.currencyCode}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Step 3: Payment Redirect */}
            <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded hover:bg-neutral-800 disabled:opacity-50"
            >
                Continue to Payment
            </button>

            <p className="text-xs text-center text-gray-500 mt-2">
                Secure checkout via Shopify
            </p>
        </div>
    );
}
