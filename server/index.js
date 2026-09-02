import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { port } from './src/config.js';
import { initDb } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import draftRoutes from './src/routes/drafts.js';
import generateRoutes from './src/routes/generate.js';
import healthRoutes from './src/routes/health.js';
import profileRoutes from './src/routes/profile.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many auth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);
app.use('/api/', apiLimiter);

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', generateRoutes);
app.use('/api', draftRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed', error);
    process.exit(1);
  });
