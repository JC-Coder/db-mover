// import { initializeApp } from "firebase-admin";
import { cert, initializeApp, App, ServiceAccount } from "firebase-admin/app";
import { Database, getDatabase } from "firebase-admin/database";
import { Firestore, getFirestore } from "firebase-admin/firestore";

export type FirebaseMode = "rtdb" | "firestore";

export interface IInitializeApp {
    app: App,
    database?: Database;
    firestore?: Firestore;
}

export const initializer = ({
    type,
    url,
    credential,
    name,
}: {
    type?: FirebaseMode;
    url?: string; // only for rtdb
        credential: ServiceAccount;
    name: string,
    }): IInitializeApp => {

    const app = initializeApp(
        {
            credential: cert({
                projectId: credential.projectId,
                clientEmail: credential.clientEmail,
                privateKey: credential.privateKey,
            }),
            ...(type === "rtdb" && {
                databaseURL: url,
            }),
        },
        name
    );

    return {
        app,
        ...(type === "rtdb" && {
            database: getDatabase(app)
        }),
        ...(type === "firestore" && {
            firestore: getFirestore(app)
        }),
    };
};