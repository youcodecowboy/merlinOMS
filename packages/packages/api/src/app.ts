import express from 'express';
import { authRoutes } from './routes/auth.routes';
import { moveRoutes } from './routes/move.routes';
import { patternRoutes } from './routes/pattern.routes';
import { cuttingRoutes } from './routes/cutting.routes';
import { packingRoutes } from './routes/packing.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/move', moveRoutes);
app.use('/pattern', patternRoutes);
app.use('/cutting', cuttingRoutes);
app.use('/packing', packingRoutes);

// Error handling
app.use(errorMiddleware);

export default app; 