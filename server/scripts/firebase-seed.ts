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
    console.log("Usage: tsx scripts/firebase-seed.ts --cred <serviceAccount.json> --url <RTDB_URL>");
    console.log("Example: tsx scripts/firebase-seed.ts --cred ./service-account.json --url https://my-project-default-rtdb.firebaseio.com");
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
        }, `seed-${Date.now()}`);

        const database = getDatabase(app);
        const firestore = getFirestore(app);

        console.log("Seeding Realtime Database to", FIREBASE_TEST_ROOT);
        await database.ref(FIREBASE_TEST_ROOT).set(rtdbSeed);

        console.log("Seeding Firestore collection", FIREBASE_TEST_ROOT);
        for (const entry of firestoreSeedDocs) {
            await firestore.collection(FIREBASE_TEST_ROOT).doc(entry.id).set(entry.data);
        }

        for (const activitySet of firestoreActivities) {
            for (const activityRecord of activitySet.docs) {
                await firestore
                    .collection(FIREBASE_TEST_ROOT)
                    .doc(activitySet.parentId)
                    .collection("activities")
                    .doc(activityRecord.id)
                    .set(activityRecord.data);
            }
        }

        console.log("Firebase seed completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Firebase seed failed:", error);
        process.exit(1);
    }
}

main();
