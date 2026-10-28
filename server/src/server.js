import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { User } from './models/index.js';
import { seedData } from './utils/seed.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed if database is freshly started and empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[HomeBooks ERP] Fresh database detected. Auto-seeding initial pharmacy dataset...');
      await seedData(false);
    }

    const server = app.listen(PORT, () => {
      console.log(`[HomeBooks ERP] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[HomeBooks ERP] API Health check available at: http://localhost:${PORT}/api/v1/health`);
    });

    const shutdown = async () => {
      console.log('\n[HomeBooks ERP] Gracefully shutting down server...');
      server.close(() => {
        console.log('[HomeBooks ERP] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[HomeBooks ERP] Critical server startup failure:', err);
    process.exit(1);
  }
};

startServer();
