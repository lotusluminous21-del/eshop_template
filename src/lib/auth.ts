import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User | null> {
    if (!auth) {
        throw new Error('Firebase Auth is not initialized. Check your configuration.');
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Error signing in with Google', error);
        throw error;
    }
}

export async function signOutUser(): Promise<void> {
    if (!auth) return;
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out', error);
    }
}
