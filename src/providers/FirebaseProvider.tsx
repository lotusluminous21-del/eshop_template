'use client';

import { ReactNode } from 'react';
import { FirebaseAppProvider, AuthProvider, FirestoreProvider, FunctionsProvider } from 'reactfire';
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from '@/lib/firebase/config';

interface FirebaseProviderProps {
    children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
    const app = getFirebaseApp();
    const auth = getFirebaseAuth();
    const firestore = getFirebaseDb();
    const functions = getFirebaseFunctions();

    return (
        <FirebaseAppProvider firebaseApp={app}>
            <AuthProvider sdk={auth}>
                <FirestoreProvider sdk={firestore}>
                    <FunctionsProvider sdk={functions}>
                        {children}
                    </FunctionsProvider>
                </FirestoreProvider>
            </AuthProvider>
        </FirebaseAppProvider>
    );
}
