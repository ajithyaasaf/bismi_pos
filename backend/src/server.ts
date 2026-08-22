import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 Bismi Chicken POS Backend running on port ${config.port}`);
  logger.info(`🐔 Environment: ${config.nodeEnv} | Brand Primary: ${config.brandColor}`);
  logger.info(`📡 API endpoint: http://localhost:${config.port}/api/v1`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
