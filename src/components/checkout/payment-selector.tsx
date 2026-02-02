'use client';

import * as React from 'react';
import { PaymentProviderId } from '@/lib/payments/types';

interface PaymentProviderOption {
    id: PaymentProviderId;
    name: string;
}

// In a real app, this would be fetched from an API that calls PaymentProviderFactory.getAll()
// Since this is a client component, we need to pass these as props or fetch them.
// For now, we'll assume the parent component passes the available providers.
interface PaymentSelectorProps {
    providers: PaymentProviderOption[];
    selectedProviderId: PaymentProviderId | null;
    onSelect: (providerId: PaymentProviderId) => void;
}

export function PaymentSelector({ providers, selectedProviderId, onSelect }: PaymentSelectorProps) {
    if (providers.length === 0) {
        return (
            <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-700">
                No payment methods available. Please contact support.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {providers.map((provider) => (
                    <div
                        key={provider.id}
                        onClick={() => onSelect(provider.id)}
                        className={`
              relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none
              ${selectedProviderId === provider.id
                                ? 'border-indigo-600 ring-2 ring-indigo-600'
                                : 'border-gray-300 hover:border-gray-400'}
            `}
                    >
                        <div className="flex flex-1">
                            <div className="flex flex-col">
                                <span className="block text-sm font-medium text-gray-900">
                                    {provider.name}
                                </span>
                                <span className="mt-1 flex items-center text-sm text-gray-500">
                                    {/* We could add logos/descriptions here */}
                                    Pay securely with {provider.name}
                                </span>
                            </div>
                        </div>
                        {selectedProviderId === provider.id && (
                            <div className="h-5 w-5 text-indigo-600" aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
