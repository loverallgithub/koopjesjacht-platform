/**
 * Logger Utility
 * Simple console-based logger for the application
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? JSON.stringify(args, null, 2) : '';
    return `[${timestamp}] [${level}] ${message} ${formattedArgs}`;
  }

  info(message, ...args) {
    console.log(
      `${colors.cyan}${this.formatMessage('INFO', message, ...args)}${colors.reset}`
    );
  }

  error(message, ...args) {
    console.error(
      `${colors.red}${this.formatMessage('ERROR', message, ...args)}${colors.reset}`
    );
  }

  warn(message, ...args) {
    console.warn(
      `${colors.yellow}${this.formatMessage('WARN', message, ...args)}${colors.reset}`
    );
  }

  debug(message, ...args) {
    if (this.isDevelopment) {
      console.log(
        `${colors.blue}${this.formatMessage('DEBUG', message, ...args)}${colors.reset}`
      );
    }
  }

  success(message, ...args) {
    console.log(
      `${colors.green}${this.formatMessage('SUCCESS', message, ...args)}${colors.reset}`
    );
  }
}

module.exports = new Logger();
