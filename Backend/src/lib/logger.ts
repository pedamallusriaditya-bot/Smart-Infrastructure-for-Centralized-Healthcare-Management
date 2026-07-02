import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // Log errors to a file
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Log everything to a combined file
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we are not in production, also log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      printf(({ level, message, timestamp, requestId, ...meta }) => {
        return `[${timestamp}] ${level}: ${message} ${requestId ? `(ReqID: ${requestId})` : ''} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    ),
  }));
}