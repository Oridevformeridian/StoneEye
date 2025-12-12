/**
 * Error Handler Service
 * 
 * Centralized error handling, classification, and logging.
 * Provides consistent error formatting and user-friendly messages.
 */

// Error types
export const ErrorType = {
  NETWORK: 'NETWORK',
  DATABASE: 'DATABASE',
  PARSING: 'PARSING',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
};

// Severity levels
export const Severity = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
};

/**
 * Classify error based on error object or message
 */
export function classifyError(error) {
  if (!error) return ErrorType.UNKNOWN;

  const message = error.message || error.toString();
  const name = error.name || '';

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('CORS') ||
    name === 'NetworkError' ||
    error.code === 'ECONNREFUSED'
  ) {
    return ErrorType.NETWORK;
  }

  // Database errors
  if (
    message.includes('Dexie') ||
    message.includes('IndexedDB') ||
    message.includes('QuotaExceededError') ||
    message.includes('database') ||
    name === 'DatabaseError'
  ) {
    return ErrorType.DATABASE;
  }

  // Parsing errors
  if (
    message.includes('JSON') ||
    message.includes('parse') ||
    message.includes('Unexpected token') ||
    name === 'SyntaxError'
  ) {
    return ErrorType.PARSING;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    name === 'ValidationError'
  ) {
    return ErrorType.VALIDATION;
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('unauthorized') ||
    error.code === 'EACCES'
  ) {
    return ErrorType.PERMISSION;
  }

  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('404') ||
    name === 'NotFoundError'
  ) {
    return ErrorType.NOT_FOUND;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error, type = null) {
  const errorType = type || classifyError(error);

  const userMessages = {
    [ErrorType.NETWORK]: 'Unable to connect to the server. Please check your internet connection and try again.',
    [ErrorType.DATABASE]: 'There was a problem accessing the local database. Your data is safe, but you may need to refresh the page.',
    [ErrorType.PARSING]: 'The data format was unexpected. This might be due to corrupted files or incompatible game data.',
    [ErrorType.VALIDATION]: 'The provided data is invalid or incomplete. Please check your input and try again.',
    [ErrorType.PERMISSION]: 'Permission denied. You may need to allow access to certain files or features.',
    [ErrorType.NOT_FOUND]: 'The requested resource was not found. It may have been moved or deleted.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again or report this issue if it persists.',
  };

  return userMessages[errorType] || userMessages[ErrorType.UNKNOWN];
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverable(error, type = null) {
  const errorType = type || classifyError(error);
  
  // Network and database errors are typically recoverable
  return [ErrorType.NETWORK, ErrorType.DATABASE, ErrorType.PERMISSION].includes(errorType);
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error, context = {}) {
  const type = classifyError(error);
  
  return {
    type,
    message: error.message || error.toString(),
    userMessage: getUserMessage(error, type),
    recoverable: isRecoverable(error, type),
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };
}

/**
 * Log error with appropriate severity
 */
export function logError(error, severity = Severity.ERROR, context = {}) {
  const errorResponse = createErrorResponse(error, context);
  
  const logPrefix = `[ErrorHandler:${severity.toUpperCase()}]`;
  const logData = {
    ...errorResponse,
    context,
  };

  switch (severity) {
    case Severity.ERROR:
      console.error(logPrefix, error);
      console.error('Error details:', logData);
      break;
    case Severity.WARN:
      console.warn(logPrefix, error);
      console.warn('Warning details:', logData);
      break;
    case Severity.INFO:
      console.info(logPrefix, error);
      console.info('Info details:', logData);
      break;
    default:
      console.log(logPrefix, error);
  }

  return errorResponse;
}

/**
 * Handle error with logging and optional notification
 */
export function handleError(error, options = {}) {
  const {
    severity = Severity.ERROR,
    context = {},
    notify = false,
    rethrow = false,
  } = options;

  const errorResponse = logError(error, severity, context);

  // TODO: Integrate with toast notification system when available
  if (notify && window.__showToast) {
    window.__showToast({
      type: 'error',
      message: errorResponse.userMessage,
      duration: 5000,
    });
  }

  if (rethrow) {
    throw error;
  }

  return errorResponse;
}

export default {
  ErrorType,
  Severity,
  classifyError,
  getUserMessage,
  isRecoverable,
  createErrorResponse,
  logError,
  handleError,
};
