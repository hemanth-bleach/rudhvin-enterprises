import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri !== 'embedded') {
    try {
      console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log('✅ [DB] Successfully connected to configured MongoDB');
      return;
    } catch (err) {
      console.warn(`⚠️ [DB] Could not connect to external MongoDB (${err.message}). Using persistent local database engine.`);
    }
  }

  console.log('✅ [DB] Using persistent local JSON/BSON database engine (C:\\Rudhvin enterprices\\backend\\data\\rudhvin_store.json)');
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
