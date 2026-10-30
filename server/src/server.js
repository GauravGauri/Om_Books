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

    // Remove other user accounts and ensure only Super Admin accounts exist
    const removedNonAdmins = await User.deleteMany({ role: { $ne: 'Super Admin' } });
    if (removedNonAdmins.deletedCount > 0) {
      console.log(`[HomeBooks ERP] Cleaned up ${removedNonAdmins.deletedCount} non-Super Admin account(s).`);
    }

    const superAdminCount = await User.countDocuments({ role: 'Super Admin' });
    if (superAdminCount === 0) {
      console.log('[HomeBooks ERP] No Super Admin account detected. Auto-seeding initial dataset...');
      await seedData(false);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
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
