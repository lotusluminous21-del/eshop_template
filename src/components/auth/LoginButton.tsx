'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function LoginButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Login failed", error);
            // Optionally add toast notification here
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button onClick={handleLogin} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in with Google
        </Button>
    );
}
