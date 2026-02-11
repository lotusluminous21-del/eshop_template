import Link from 'next/link';

export function Footer() {
    return (
        <footer className="bg-background border-t">
            <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 sm:py-16 lg:px-8">
                <nav className="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12" aria-label="Footer">
                    <div className="pb-6">
                        <Link href="/" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                            Home
                        </Link>
                    </div>
                    <div className="pb-6">
                        <Link href="/collections/all" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                            Shop
                        </Link>
                    </div>
                    <div className="pb-6">
                        <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                            About
                        </Link>
                    </div>
                    <div className="pb-6">
                        <Link href="#" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                            Contact
                        </Link>
                    </div>
                    <div className="pb-6">
                        <Link href="/admin/drafts" className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                            Admin
                        </Link>
                    </div>
                </nav>
                <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">
                    &copy; {new Date().getFullYear()} Your Company, Inc. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
