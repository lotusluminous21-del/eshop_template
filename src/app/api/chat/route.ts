
import { NextRequest, NextResponse } from 'next/server';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp, getApps, getApp } from 'firebase/app';
// import { StreamingTextResponse, LangChainAdapter } from 'ai'; // Deprecated/Not found in new SDK

// Initialize Firebase (Client SDK side, but running on server)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Ensure app is initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const functions = getFunctions(app, 'europe-west1');

// Connect to emulator if in dev
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    // connectFunctionsEmulator(functions, 'localhost', 5001); // Uncomment if using emulators
}

export async function POST(req: NextRequest) {
    try {
        const { messages, sessionId } = await req.json();
        const lastMessage = messages[messages.length - 1];

        if (!lastMessage) {
            return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }

        // Call the Python Cloud Function
        // Note: Callable functions might timeout on Vercel Standard Serverless (10s default)
        // You might need to increase Vercel function timeout or use Edge logic calling simple HTTP
        // Type the Cloud Function response
        interface ChatResponse {
            response: string;
        }

        const chatAssistant = httpsCallable<
            { message: string; sessionId: string },
            ChatResponse
        >(functions, 'chat_assistant');

        // We await the full response since our Callable is not streaming
        // For true streaming, we'd need to convert the Python function to an HTTP function returning SSE
        const result = await chatAssistant({
            message: lastMessage.content,
            sessionId: sessionId || 'guest-session',
        });

        const data = result.data;
        const responseText = data.response;

        // Wrap in a Stream to satisfy the Vercel AI SDK client which expects a stream
        // This is a "simulated" stream of one chunk
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(responseText));
                controller.close();
            },
        });

        return new Response(stream);

    } catch (error: unknown) {
        console.error('Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred during chat';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
