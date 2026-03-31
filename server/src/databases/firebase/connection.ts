import { App } from 'firebase-admin/app';
import { firestore, ServiceAccount } from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { FirebaseMode, initializer } from './helper';

export const connectToFirebase = async (uri: string, credent: string | ServiceAccount, type: string) => {
    const client = initializer({ url: uri, type: type as FirebaseMode, credential: credent, name: `app-${Date.now()}` });
    return client;
};

export const verifyConnection = async (uri: string, credent: string | ServiceAccount) => {

    try {
        const client = initializer({ url: uri, credential: credent, name: `verify-${Date.now()}` });
        if (!client.app) throw new Error("unable to initialize firebase");

        await getDatabase(client.app).ref("/").once("value");
        await firestore(client.app).listCollections();

        return true;
    } catch (error) {
        console.error("Connection verification failed:", error);
        return false;
    } finally {

    }
};
