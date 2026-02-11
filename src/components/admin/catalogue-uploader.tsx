'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase';
import { UploadCloud } from 'lucide-react';

export function CatalogueUploader() {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);

        try {
            const storage = getStorage(app);
            // Upload to 'catalogues/' path with timestamp to avoid name collisions
            const fileName = `catalogues/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);

            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(progress);
                },
                (error) => {
                    console.error("Upload failed:", error);
                    alert("Upload failed. Check console.");
                    setUploading(false);
                },
                () => {
                    // Upload completed successfully
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        setUploading(false);
                        alert("Upload complete! Processing has started. Drafts will appear below shortly.");
                        // Optional: Reset input
                        if (e.target) e.target.value = '';
                    });
                }
            );

        } catch (error) {
            console.error("Error starting upload:", error);
            setUploading(false);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative mb-8">
            <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.csv,.json,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
            />

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-gray-100 p-4 rounded-full">
                    <UploadCloud className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Upload Catalogue</h3>
                    <p className="text-sm text-gray-500">Drag and drop or click to select</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, CSV, JSON supported</p>
                </div>
            </div>

            {uploading && (
                <div className="mt-6 space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-black h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500">Uploading... {Math.round(progress)}%</p>
                </div>
            )}
        </div>
    );
}
