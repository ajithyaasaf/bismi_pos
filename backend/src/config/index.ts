import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'bismi-pos-default-jwt-secret-key-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'bismi-pos-default-refresh-secret-2026',
  jwtExpiry: '12h',
  jwtRefreshExpiry: '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  maxFailedPins: 5,
  pinLockoutMinutes: 5,
  brandColor: '#FB2C36',
};
