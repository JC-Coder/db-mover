import { ServiceAccount } from 'firebase-admin';
import { deleteApp } from 'firebase-admin/app';
import { FirebaseMode, IInitializeApp, initializer } from './helper';

export const connectToFirebase = async (uri: string, credential: ServiceAccount, type: string) => {
    const client = initializer({ url: uri, type: type as FirebaseMode, credential: credential, name: `app-${Date.now()}` });
    return client;
};

// Verifies connectivity to either Firebase Realtime Database or Firestore based on mode.
export const verifyConnection = async (uri: string, credential: ServiceAccount, type = "rtdb") => {
    const mode = type === "firestore" ? "firestore" : "rtdb";
    let client: IInitializeApp | null = null;
    try {
        client = initializer({ url: uri, type: mode, credential: credential, name: `verify-${Date.now()}` });
        if (!client.app) {
            throw new Error("unable to initialize firebase");
        }

        if (mode === "firestore") {
            await client.firestore?.listCollections();
        } else {
            await client.database?.ref(".info/connected").once("value");
        }

        return true;
    } catch (error) {
        console.error("Connection verification failed:", error);
        return false;
    } finally {
        if (client?.firestore) {
            await client.firestore.terminate().catch(() => { });
        }
        if (client?.app) {
            await deleteApp(client.app).catch(() => { });
        }
    }
};
