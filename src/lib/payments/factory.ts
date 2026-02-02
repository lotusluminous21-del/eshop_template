import { PaymentProvider, PaymentProviderId } from './types';

// Registry of available providers
const providers = new Map<PaymentProviderId, PaymentProvider>();

export class PaymentProviderFactory {
    static register(provider: PaymentProvider) {
        if (providers.has(provider.id)) {
            console.warn(`Payment provider ${provider.id} is already registered. Overwriting.`);
        }
        providers.set(provider.id, provider);
    }

    static get(providerId: PaymentProviderId): PaymentProvider {
        const provider = providers.get(providerId);
        if (!provider) {
            throw new Error(`Payment provider '${providerId}' not found. Make sure it is registered.`);
        }
        return provider;
    }

    static getAll(): PaymentProvider[] {
        return Array.from(providers.values());
    }
}
