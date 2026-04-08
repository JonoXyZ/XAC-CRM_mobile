// mongoAuth.js
const { MongoClient } = require('mongodb');
const { initAuthCreds } = require('@whiskeysockets/baileys');

// Make sure you set MONGO_URI in your environment variables
// Example: MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
const client = new MongoClient(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let collection;

// Initialize MongoDB and collection
async function initMongo() {
    if (!collection) {
        await client.connect();
        const db = client.db("xac_crm"); // Database name
        collection = db.collection("whatsapp_sessions"); // Collection name
    }
}

// Get or create auth state for a user
async function useMongoAuthState(sessionId) {
    await initMongo();

    let session = await collection.findOne({ sessionId });

    if (!session) {
        session = {
            sessionId,
            data: {
                creds: initAuthCreds(),
                keys: {}
            }
        };
        await collection.insertOne(session);
    }

    return {
        state: session.data,
        saveCreds: async (data) => {
            await collection.updateOne(
                { sessionId },
                { $set: { data } },
                { upsert: true }
            );
        }
    };
}

module.exports = { useMongoAuthState };