import pino from 'pino';
import config from './config.js';

const intlFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const logger = pino({
  level: config.LOG_LEVEL,
  timestamp: () => `,"time":"${intlFormatter.format(new Date())}"`,
  ...(config.LOG_PRETTY && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: false,
        ignore: 'pid,hostname,req,res,responseTime,requestId,userId',
        singleLine: true,
      },
    },
  }),
});

export default logger;
