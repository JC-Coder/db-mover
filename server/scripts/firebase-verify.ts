import fs from "fs";
import path from "path";
import { cert, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { FIREBASE_TEST_ROOT, firestoreActivities, firestoreSeedDocs, rtdbSeed } from "./firebase-seed-data";

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed: Record<string, string> = {};

    if (args.includes("--help")) {
        parsed.help = "true";
        return parsed;
    }

    for (let i = 0; i < args.length; i += 1) {
        if (args[i].startsWith("--")) {
            const key = args[i].slice(2);
            const value = args[i + 1];
            if (!value || value.startsWith("--")) {
                throw new Error(`Missing value for argument ${args[i]}`);
            }
            parsed[key] = value;
            i += 1;
        }
    }

    return parsed;
}

function printUsage() {
    console.log("Usage: tsx scripts/firebase-verify.ts --cred <serviceAccount.json> --url <RTDB_URL>");
    console.log("Example: tsx scripts/firebase-verify.ts --cred ./service-account.json --url https://my-project-default-rtdb.firebaseio.com");
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    if (a === null || b === null) {
        return false;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        return a.every((item, index) => deepEqual(item, b[index]));
    }

    if (typeof a === "object" && typeof b === "object") {
        const aKeys = Object.keys(a as Record<string, unknown>).sort();
        const bKeys = Object.keys(b as Record<string, unknown>).sort();

        if (aKeys.length !== bKeys.length) {
            return false;
        }

        return aKeys.every((key) => {
            if (!bKeys.includes(key)) {
                return false;
            }
            return deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
        });
    }

    return false;
}

async function verifyFirestoreData(firestore: ReturnType<typeof getFirestore>): Promise<void> {
    const querySnapshot = await firestore.collection(FIREBASE_TEST_ROOT).get();
    const actualDocs: Record<string, unknown> = {};

    querySnapshot.forEach((doc) => {
        actualDocs[doc.id] = doc.data();
    });

    if (querySnapshot.size !== firestoreSeedDocs.length) {
        throw new Error(`Expected ${firestoreSeedDocs.length} Firestore docs but found ${querySnapshot.size}`);
    }

    for (const expected of firestoreSeedDocs) {
        const actual = actualDocs[expected.id];
        if (!actual || !deepEqual(actual, expected.data)) {
            throw new Error(`Firestore document ${expected.id} does not match expected data.\nExpected: ${JSON.stringify(expected.data, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`);
        }
    }

    for (const activitySet of firestoreActivities) {
        const activitySnapshot = await firestore
            .collection(FIREBASE_TEST_ROOT)
            .doc(activitySet.parentId)
            .collection("activities")
            .get();

        if (activitySnapshot.size !== activitySet.docs.length) {
            throw new Error(`Expected ${activitySet.docs.length} activities for ${activitySet.parentId} but found ${activitySnapshot.size}`);
        }

        activitySnapshot.forEach((doc) => {
            const expected = activitySet.docs.find((record) => record.id === doc.id);
            if (!expected) {
                throw new Error(`Unexpected Firestore activity doc ${doc.id} found for ${activitySet.parentId}`);
            }
            if (!deepEqual(doc.data(), expected.data)) {
                throw new Error(`Firestore activity ${doc.id} does not match expected data.\nExpected: ${JSON.stringify(expected.data, null, 2)}\nActual: ${JSON.stringify(doc.data(), null, 2)}`);
            }
        });
    }
}

async function main() {
    try {
        const args = parseArgs();

        if (args.help) {
            printUsage();
            process.exit(0);
        }

        const credPath = args.cred;
        const databaseURL = args.url;

        if (!credPath || !databaseURL) {
            printUsage();
            process.exit(1);
        }

        const resolvedPath = path.resolve(process.cwd(), credPath);
        const fileContents = fs.readFileSync(resolvedPath, "utf8");
        const credential = JSON.parse(fileContents);

        const app = initializeApp({
            credential: cert(credential),
            databaseURL,
        }, `verify-${Date.now()}`);

        const database = getDatabase(app);
        const firestore = getFirestore(app);

        console.log("Verifying Realtime Database path", FIREBASE_TEST_ROOT);
        const snapshot = await database.ref(FIREBASE_TEST_ROOT).once("value");
        const actualRtdb = snapshot.val();

        if (!deepEqual(actualRtdb, rtdbSeed)) {
            throw new Error(`Realtime Database data does not match expected seed.\nExpected: ${JSON.stringify(rtdbSeed, null, 2)}\nActual: ${JSON.stringify(actualRtdb, null, 2)}`);
        }

        console.log("Realtime Database seed verified.");
        console.log("Verifying Firestore seed data.");
        await verifyFirestoreData(firestore);
        console.log("Firestore seed verified.");
        console.log("Firebase verification completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Firebase verification failed:", error);
        process.exit(1);
    }
}

main();
