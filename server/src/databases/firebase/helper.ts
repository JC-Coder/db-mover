// import { initializeApp } from "firebase-admin";
import { cert, initializeApp, App } from "firebase-admin/app";
import { Database, getDatabase } from "firebase-admin/database";
import { Firestore, getFirestore } from "firebase-admin/firestore";

// export const initializer = (uri: string, credent: string | ServiceAccount, dbName: string) => {
//     return initializeApp({
//         credential: cert({ ...credent as object }),
//         databaseURL: uri,
//     }, dbName);
// };

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
    credential: any;
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