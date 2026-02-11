'use client';

import { useState } from 'react';
import { publishProductAction } from '@/app/actions/publish-product';
import { doc, deleteDoc, setDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

interface DraftReviewCardProps {
    draft: {
        id: string;
        title: string;
        description: string;
        price: number | null;
        sku: string;
        tags: string[];
    };
}

export function DraftReviewCard({ draft }: DraftReviewCardProps) {
    const [formData, setFormData] = useState(draft);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePublish = async () => {
        setIsPublishing(true);

        // 1. Call Server Action to Publish
        const result = await publishProductAction(draft.id, formData);

        if (result.success) {
            const db = getFirestore(app);

            // 2. PROMOTE TO LIVE (for Agent RAG)
            try {
                // Copy data to 'products_live' using the Shopify ID as key
                await setDoc(doc(db, 'products_live', result.shopifyId), {
                    ...formData,
                    shopifyId: result.shopifyId,
                    handle: result.handle,
                    status: 'active',
                    promoted_at: new Date().toISOString(),
                    embedding_reindex_needed: true
                });

                // 3. Remove from Drafts
                await deleteDoc(doc(db, 'product_drafts', draft.id));
                alert(`Published! Shopify ID: ${result.shopifyId}`);
            } catch (err) {
                console.error("Error promoting:", err);
                alert("Published to Shopify, but failed to sync to RAG DB.");
            }
        } else {
            alert(`Error: ${result.error}`);
            setIsPublishing(false);
        }
    };

    const handleDiscard = async () => {
        if (!confirm("Are you sure you want to discard this draft?")) return;
        const db = getFirestore(app);
        await deleteDoc(doc(db, 'product_drafts', draft.id));
    };

    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product Title</label>
                        <input
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Price (Cents/Unit)</label>
                        <input
                            name="price"
                            value={formData.price || ''}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            placeholder="e.g. 1999"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-2 border rounded h-24"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">SKU</label>
                        <input
                            name="sku"
                            value={formData.sku || ''}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>
            </div>

            <div className="flex md:flex-col gap-2 justify-end md:justify-start min-w-[150px]">
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                    {isPublishing ? 'Publishing...' : 'Approve & Publish'}
                </button>
                <button
                    onClick={handleDiscard}
                    className="border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50"
                >
                    Discard
                </button>
            </div>
        </div>
    );
}
