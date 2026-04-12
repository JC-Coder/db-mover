import { firestore, ServiceAccount } from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { FirebaseMode, initializer } from './helper';

export const connectToFirebase = async (uri: string, credential: ServiceAccount, type: string) => {
    const client = initializer({ url: uri, type: type as FirebaseMode, credential: credential, name: `app-${Date.now()}` });
    return client;
};

export const verifyConnection = async (uri: string, credential: ServiceAccount) => {
    try {
        const client = initializer({ url: uri, credential: credential, name: `verify-${Date.now()}` });
        if (!client.app) {
            throw new Error("unable to initialize firebase");
        }

        await getDatabase(client.app).ref(".info/connected").once("value");
        await firestore(client.app).listCollections();

        return true;
    } catch (error) {
        console.error("Connection verification failed:", error);
        return false;
    }
};
