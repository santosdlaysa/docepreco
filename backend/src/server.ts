import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { sendDailyUserReport } from './infrastructure/services/telegramService';
import { connectDatabase } from './infrastructure/database/connection';
import recipeRoutes from './presentation/routes/recipeRoutes';
import ingredientRoutes from './presentation/routes/ingredientRoutes';
import saleRoutes from './presentation/routes/saleRoutes';
import authRoutes from './presentation/routes/authRoutes';
import statsRoutes from './presentation/routes/statsRoutes';
import premiumRoutes from './presentation/routes/premiumRoutes';
import adminRoutes from './presentation/routes/adminRoutes';
import { authMiddleware } from './presentation/middleware/authMiddleware';
import telegramRoutes from './presentation/routes/telegramRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', authMiddleware, recipeRoutes);
app.use('/api/ingredients', authMiddleware, ingredientRoutes);
app.use('/api/sales', authMiddleware, saleRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api', premiumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram', telegramRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // Relatório diário às 8h (horário de Brasília)
    cron.schedule('0 8 * * *', () => sendDailyUserReport(), { timezone: 'America/Sao_Paulo' });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
