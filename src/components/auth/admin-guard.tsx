'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login?redirect=/admin/drafts');
            } else if (!isAdmin) {
                // User logged in but not admin
                router.push('/');
                // Maybe show a toast: "Unauthorized Access" here?
            }
        }
    }, [user, isAdmin, loading, router]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Checking permissions...</div>;
    }

    if (!isAdmin) {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}
