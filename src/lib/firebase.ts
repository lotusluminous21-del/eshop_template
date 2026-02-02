import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuration interface
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton initialization
let app: FirebaseApp;

try {
    if (getApps().length > 0) {
        app = getApp();
    } else {
        // Check if enough config is present to at least try initializing
        // For plug-and-play, if config is missing, we might want to return null or throw depending on usage.
        // Here we'll initialize if projectId is present, otherwise warn.
        if (firebaseConfig.projectId) {
            app = initializeApp(firebaseConfig);
        } else {
            console.warn('Firebase configuration missing. Firebase features will not work.');
            // Create a dummy app object or handle gracefully if possible, 
            // but for now we'll throw locally to encourage setting up .env
        }
    }
} catch (e) {
    console.error('Firebase initialization error', e);
}

// Export auth/firestore instances. 
// Note: These will be undefined if app failed to init.
// Consumers should handle that or ensuring config is present.
export const auth = app! ? getAuth(app) : null;
export const db = app! ? getFirestore(app) : null;
export const storage = app! ? getStorage(app) : null;
export const functions = app! ? getFunctions(app, 'europe-west1') : null;

export { app };
