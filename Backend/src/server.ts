import app from './app.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

async function bootstrap() {
  try {
    // 1. Connection Verification (Part 5 Audit)
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database Connected: PostgreSQL responsive');

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 API Gateway active at port ${PORT}`);
    });

    // 2. Graceful Shutdown (Memory leak & connection leak prevention)
    const shutdown = async (sig: string) => {
      logger.info(`${sig} received. Closing processes...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Clean exit completed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error('Startup Error', { error: err });
    process.exit(1);
  }
}

bootstrap();