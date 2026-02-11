'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginButtonProps {
    text?: string;
    onSuccess?: () => void;
    className?: string;
}

export function LoginButton({ text = 'Google', onSuccess, className }: LoginButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Login failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleLogin}
            disabled={isLoading}
            className={cn("w-full relative", className)}
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                    <path
                        d="M12.0003 20.45c4.656 0 8.556-3.21 9.9-7.59h-9.9v-3.78h14.49c.27 1.47.41 3.03.41 4.65 0 8.01-5.76 13.74-13.41 12.09C6.9003 24.54 2.8503 20.49 1.4103 14.97c-.36-1.47-.36-3.03-.09-4.56.27-1.47 1.05-4.23 3.21-6.3L8.0403 7.8c-1.29 1.14-2.19 2.76-2.19 4.65 0 3.12 2.13 5.79 5.04 6.72l1.11-3.72z"
                        fill="#4285F4"
                    />
                </svg>
            )}
            {text}
        </Button>
    );
}
