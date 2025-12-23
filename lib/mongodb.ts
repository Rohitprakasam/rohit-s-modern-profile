
import { MongoClient, MongoClientOptions } from 'mongodb';


if (!process.env.MONGODB_URI) {
    console.error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI || "";
const options: MongoClientOptions = {
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
    clientPromise = Promise.reject(new Error('Invalid/Missing environment variable: "MONGODB_URI"'));
} else {
    if (process.env.NODE_ENV === 'development') {
        let globalWithMongo = global as typeof globalThis & {
            _mongoClientPromise?: Promise<MongoClient>;
        };

        if (!globalWithMongo._mongoClientPromise) {
            client = new MongoClient(uri, options);
            globalWithMongo._mongoClientPromise = client.connect();
        }
        clientPromise = globalWithMongo._mongoClientPromise;
    } else {
        try {
            client = new MongoClient(uri, options);
            clientPromise = client.connect();
            // Prevent UnhandledPromiseRejectionWarning
            clientPromise.catch(err => {
                console.error("MongoDB Connection Failed:", err);
            });
        } catch (err) {
            console.error("MongoDB Client Init Failed:", err);
            // Return a safe rejected promise instead of crashing
            clientPromise = Promise.reject(err);
        }
    }
}

export default clientPromise;
