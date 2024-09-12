import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string; // Ensure MONGODB_URI is defined
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve MongoClient across module reloads
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's okay to create a new MongoClient each time
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;
