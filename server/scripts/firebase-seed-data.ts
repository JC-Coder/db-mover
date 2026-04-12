export const FIREBASE_TEST_ROOT = "migration_test_seed";

export interface IActivity {
    type: string;
    timestamp: string;
    details: {
        ip: string;
        device: string;
    };
}

export interface IUserProfile {
    age: number;
    tags: string[];
    locale: string;
}

export interface IUserRecord {
    name: string;
    email: string;
    active: boolean;
    profile: IUserProfile;
    preferences: {
        newsletter: boolean;
        locales: string[];
    };
    orderIds: string[];
}

export const rtdbSeed = {
    users: {
        user_1: {
            name: "Alice",
            email: "alice@example.com",
            active: true,
            profile: {
                age: 28,
                tags: ["rtdb", "firestore"],
                locale: "en-US",
            },
        },
        user_2: {
            name: "Bob",
            email: "bob@example.com",
            active: false,
            profile: {
                age: 34,
                tags: ["migration", "download"],
                locale: "en-GB",
            },
        },
    },
    orders: {
        orderA: {
            total: 99.95,
            status: "pending",
            items: {
                item_1: {
                    name: "Widget",
                    quantity: 2,
                    price: 24.99,
                },
                item_2: {
                    name: "Gadget",
                    quantity: 1,
                    price: 49.97,
                },
            },
            createdAt: "2026-04-12T08:00:00Z",
        },
        orderB: {
            total: 42.5,
            status: "complete",
            items: {
                item_3: {
                    name: "Pulse Sensor",
                    quantity: 5,
                    price: 8.5,
                },
            },
            createdAt: "2026-04-11T14:30:00Z",
        },
    },
    metadata: {
        createdBy: "db-mover-seed-script",
        createdAt: "2026-04-12T12:00:00Z",
        nested: {
            level1: {
                level2: {
                    note: "This is nested RTDB test data",
                },
            },
        },
    },
};

export const firestoreSeedDocs: Array<{ id: string; data: IUserRecord }> = [
    {
        id: "user_1",
        data: {
            name: "Alice",
            email: "alice@example.com",
            active: true,
            profile: {
                age: 28,
                tags: ["rtdb", "firestore"],
                locale: "en-US",
            },
            preferences: {
                newsletter: true,
                locales: ["en-US", "es-ES"],
            },
            orderIds: ["orderA", "orderB"],
        },
    },
    {
        id: "user_2",
        data: {
            name: "Bob",
            email: "bob@example.com",
            active: false,
            profile: {
                age: 34,
                tags: ["migration", "download"],
                locale: "en-GB",
            },
            preferences: {
                newsletter: false,
                locales: ["en-GB"],
            },
            orderIds: ["orderC"],
        },
    },
];

export const firestoreActivities: Array<{ parentId: string; docs: Array<{ id: string; data: IActivity }> }> = [
    {
        parentId: "user_1",
        docs: [
            {
                id: "activity_1",
                data: {
                    type: "login",
                    timestamp: "2026-04-12T08:00:00Z",
                    details: {
                        ip: "127.0.0.1",
                        device: "web",
                    },
                },
            },
            {
                id: "activity_2",
                data: {
                    type: "purchase",
                    timestamp: "2026-04-12T09:15:00Z",
                    details: {
                        ip: "127.0.0.1",
                        device: "mobile",
                    },
                },
            },
        ],
    },
];
