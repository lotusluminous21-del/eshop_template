'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
    const { user, profile, loading } = useAuth();

    // Note: Middleware should protect this, but good to have client check too or loading state
    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    if (!user) {
        return <div className="p-8 text-center">Please log in to view this page.</div>;
    }

    return (
        <div className="container mx-auto p-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">My Profile</h1>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="text-sm font-medium text-gray-500">Email</div>
                        <div className="text-lg">{user.email}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">Display Name</div>
                        <div className="text-lg">{user.displayName || 'Not set'}</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">User ID</div>
                        <div className="text-xs font-mono bg-gray-100 p-1 rounded">{user.uid}</div>
                    </div>
                </CardContent>
            </Card>

            {profile && (
                <Card>
                    <CardHeader>
                        <CardTitle>Role & Permissions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm font-medium text-gray-500">Role</div>
                            <div className="text-lg capitalize">{profile.role}</div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
