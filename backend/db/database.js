import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

// 🔁 Load correct .env file based on env (only if not loaded already by server.js)
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const connectMongoDB = async () => {
  const dbURI =
    env === 'production'
      ? process.env.MONGODB_URI_PROD || process.env.MONGODB_URI
      : process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;

  if (!dbURI) {
    console.error('❌ MONGODB_URI is not defined in environment file.');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGODB')));
    process.exit(1);
  }

  // 🛑 Safety check: Prevent connecting to production DB locally
  if (env !== 'production' && dbURI.includes('rootfin.onrender.com')) {
    console.warn('❌ Aborting: Trying to connect to production DB from non-production env.');
    process.exit(1);
  }

  try {
    // Add connection event listeners for resilience against network drops
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully.');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime connection error:', err.message);
    });

    // Connect to MongoDB
    await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected [${env}]`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectMongoDB;