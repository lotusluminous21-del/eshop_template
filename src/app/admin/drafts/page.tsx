'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { AdminGuard } from '@/components/auth/admin-guard';
import { DraftReviewCard } from '@/components/admin/product-review-card';
import { CatalogueUploader } from '@/components/admin/catalogue-uploader';

interface ProductDraft {
    id: string;
    title: string;
    description: string;
    price: number | null;
    sku: string;
    tags: string[];
    status: string;
    source_file: string;
}

export default function DraftsPage() {
    const [drafts, setDrafts] = useState<ProductDraft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const db = getFirestore(app);
        const q = query(
            collection(db, 'product_drafts'),
            where('status', '==', 'pending_review'),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: ProductDraft[] = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as ProductDraft);
            });
            setDrafts(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching drafts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AdminGuard>
            <div className="p-8 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Product Drafts Review</h1>
                <p className="text-gray-500 mb-8">
                    Review and approve products extracted by Gemini before publishing to Shopify.
                </p>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Ingest New Catalogue</h2>
                    <CatalogueUploader />
                </div>

                {loading && <div className="text-center">Loading drafts...</div>}

                {!loading && drafts.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed text-gray-400">
                        No pending drafts found. Upload a catalogue to start.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    {drafts.map((draft) => (
                        <DraftReviewCard key={draft.id} draft={draft} />
                    ))}
                </div>
            </div>
        </AdminGuard>
    );
}
