
import { Cart } from '@/lib/shopify/types';

export default function OrderSummary({ cart }: { cart: Cart }) {
    return (
        <div className="border p-6 rounded-lg h-fit bg-neutral-50">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{cart.cost.subtotalAmount.amount} {cart.cost.subtotalAmount.currencyCode}</span>
                </div>

                <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>
                        {cart.cost.totalTaxAmount
                            ? `${cart.cost.totalTaxAmount.amount} ${cart.cost.totalTaxAmount.currencyCode}`
                            : 'Calculated at checkout'}
                    </span>
                </div>

                {/* Display selected shipping if available */}
                {cart.deliveryGroups.edges.map(({ node: group }) => (
                    group.selectedDeliveryOption && (
                        <div key={group.id} className="flex justify-between text-sm">
                            <span>Shipping ({group.selectedDeliveryOption.title})</span>
                            <span>{group.selectedDeliveryOption.estimatedCost.amount} {group.selectedDeliveryOption.estimatedCost.currencyCode}</span>
                        </div>
                    )
                ))}
            </div>

            <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{cart.cost.totalAmount.amount} {cart.cost.totalAmount.currencyCode}</span>
            </div>
        </div>
    );
}
