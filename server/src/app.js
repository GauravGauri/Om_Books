import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Support comma-separated CORS origins, strip trailing slashes, and support Vercel preview domains
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim().replace(/\/+$/, ''));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or server-to-server calls with no origin header
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    const isAllowed =
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(normalizedOrigin) ||
      (normalizedOrigin.endsWith('.vercel.app') && allowedOrigins.some((ao) => ao.includes('vercel.app')));

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HomeBooks Pharmacy ERP API',
    documentation: '/api/v1/health',
    version: '1.0.0',
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
