/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Development error response
  if (process.env.NODE_ENV !== 'production') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or unknown error: don't leak error details
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
