/**
 * Application logger with environment-based levels.
 * In production, errors go to console.error only.
 * In development, all levels are active.
 */

const isDev = process.env.NODE_ENV === 'development';

const logger = {
  error: (message, ...args) => {
    console.error(`[XAC] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    if (isDev) console.warn(`[XAC] ${message}`, ...args);
  },
  info: (message, ...args) => {
    if (isDev) console.info(`[XAC] ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (isDev) console.debug(`[XAC] ${message}`, ...args);
  }
};

export default logger;
