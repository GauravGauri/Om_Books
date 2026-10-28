import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/homebooks';
  const useMemory = process.env.USE_MEMORY_DB;

  if (useMemory === 'true') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        binary: {
          version: process.env.MONGOMS_VERSION || '4.4.29',
        },
      });
      const memUri = mongodInstance.getUri();
      console.log(`[Database] Connecting to In-Memory MongoDB: ${memUri}`);
      const conn = await mongoose.connect(memUri);
      console.log(`[Database] Connected to In-Memory MongoDB successfully`);
      return conn;
    } catch (err) {
      console.error('[Database] Failed to start In-Memory MongoDB:', err.message);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected to MongoDB at ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Primary MongoDB at ${uri} unavailable (${err.message}). Falling back to MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        binary: {
          version: process.env.MONGOMS_VERSION || '4.4.29',
        },
      });
      const fallbackUri = mongodInstance.getUri();
      const conn = await mongoose.connect(fallbackUri);
      console.log(`[Database] Connected to embedded In-Memory MongoDB at ${fallbackUri}`);
      return conn;
    } catch (fallbackErr) {
      console.error('[Database] Fallback to In-Memory MongoDB also failed:', fallbackErr.message);
      throw fallbackErr;
    }
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};
