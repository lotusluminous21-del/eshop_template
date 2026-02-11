'use client';

import Link from 'next/link';
import { ShoppingCart, Search, Menu, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export function Navbar() {
    return (
        <nav className="border-b bg-background sticky top-0 z-50">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Mobile Menu Button - Placeholder for now */}
                <div className="flex lg:hidden">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                </div>

                {/* Logo */}
                <div className="flex lg:flex-1">
                    <Link href="/" className="-m-1.5 p-1.5 text-xl font-bold">
                        Storefront
                    </Link>
                </div>

                {/* Desktop Navigation - Placeholder for future collections */}
                <div className="hidden lg:flex lg:gap-x-12">
                    <Link href="/collections/all" className="text-sm font-semibold leading-6 text-foreground hover:text-muted-foreground">
                        All Products
                    </Link>
                    <Link href="/about" className="text-sm font-semibold leading-6 text-foreground hover:text-muted-foreground">
                        About
                    </Link>
                </div>

                {/* Icons */}
                <div className="flex flex-1 items-center justify-end gap-x-4">
                    <Button variant="ghost" size="icon">
                        <Search className="h-5 w-5" />
                        <span className="sr-only">Search</span>
                    </Button>
                    <Link href="/cart">
                        <Button variant="ghost" size="icon">
                            <ShoppingCart className="h-5 w-5" />
                            <span className="sr-only">Cart</span>
                        </Button>
                    </Link>
                    <AuthButtons />
                </div>
            </div>
        </nav>
    );
}

function AuthButtons() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Error signing out', error);
        }
    }

    if (loading) return null;

    if (user) {
        return (
            <div className="flex items-center gap-2">
                <Link href="/profile">
                    <Button variant="ghost" size="icon" title="Account">
                        <UserIcon className="h-5 w-5" />
                        <span className="sr-only">Account</span>
                    </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <Link href="/login">
                <Button variant="ghost" size="sm">
                    Login
                </Button>
            </Link>
            <Link href="/signup" className="hidden sm:block">
                <Button variant="default" size="sm">
                    Sign Up
                </Button>
            </Link>
        </div>
    );
}
