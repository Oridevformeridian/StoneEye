/**
 * Database Error Handler
 * 
 * Specialized error handling for Dexie/IndexedDB operations.
 * Provides user-friendly messages for common database errors.
 */

import { handleError, ErrorType, Severity } from './errorHandler';

/**
 * Database-specific error types
 */
export const DbErrorType = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  VERSION_ERROR: 'VERSION_ERROR',
  UPGRADE_ERROR: 'UPGRADE_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  CONSTRAINT_ERROR: 'CONSTRAINT_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Classify database error
 */
export function classifyDbError(error) {
  if (!error) return DbErrorType.UNKNOWN;

  const message = error.message || error.toString();
  const name = error.name || '';

  // Quota exceeded
  if (
    name === 'QuotaExceededError' ||
    message.includes('quota') ||
    message.includes('storage')
  ) {
    return DbErrorType.QUOTA_EXCEEDED;
  }

  // Version errors
  if (
    name === 'VersionError' ||
    message.includes('version') ||
    message.includes('VersionChangeBlockedError')
  ) {
    return DbErrorType.VERSION_ERROR;
  }

  // Upgrade errors
  if (
    name === 'UpgradeNeededError' ||
    message.includes('upgrade') ||
    message.includes('migration')
  ) {
    return DbErrorType.UPGRADE_ERROR;
  }

  // Transaction errors
  if (
    name === 'TransactionInactiveError' ||
    name === 'InvalidStateError' ||
    message.includes('transaction')
  ) {
    return DbErrorType.TRANSACTION_ERROR;
  }

  // Constraint errors
  if (
    name === 'ConstraintError' ||
    message.includes('constraint') ||
    message.includes('unique') ||
    message.includes('duplicate')
  ) {
    return DbErrorType.CONSTRAINT_ERROR;
  }

  // Not found errors
  if (
    name === 'NotFoundError' ||
    message.includes('not found') ||
    message.includes('does not exist')
  ) {
    return DbErrorType.NOT_FOUND;
  }

  return DbErrorType.UNKNOWN;
}

/**
 * Get user-friendly message for database error
 */
export function getDbUserMessage(error, dbErrorType = null) {
  const type = dbErrorType || classifyDbError(error);

  const messages = {
    [DbErrorType.QUOTA_EXCEEDED]:
      'Storage limit reached. Please free up space by clearing old data or increasing browser storage limits.',
    [DbErrorType.VERSION_ERROR]:
      'Database version conflict. Please refresh the page. If the problem persists, try clearing your browser cache.',
    [DbErrorType.UPGRADE_ERROR]:
      'Failed to upgrade database. Your data is safe, but you may need to refresh the page.',
    [DbErrorType.TRANSACTION_ERROR]:
      'Database transaction failed. The operation was rolled back. Please try again.',
    [DbErrorType.CONSTRAINT_ERROR]:
      'Cannot save duplicate data. This item already exists in the database.',
    [DbErrorType.NOT_FOUND]:
      'The requested data was not found in the database. It may have been deleted.',
    [DbErrorType.UNKNOWN]:
      'A database error occurred. Please try again or refresh the page.',
  };

  return messages[type] || messages[DbErrorType.UNKNOWN];
}

/**
 * Check if database error is recoverable
 */
export function isDbErrorRecoverable(error, dbErrorType = null) {
  const type = dbErrorType || classifyDbError(error);
  
  // Most DB errors are recoverable except quota and version errors
  return ![DbErrorType.QUOTA_EXCEEDED, DbErrorType.VERSION_ERROR].includes(type);
}

/**
 * Wrap database operation with error handling
 */
export async function withDbErrorHandler(dbOperation, context = {}) {
  try {
    return await dbOperation();
  } catch (error) {
    const dbErrorType = classifyDbError(error);
    
    const errorResponse = handleError(error, {
      severity: Severity.ERROR,
      context: {
        ...context,
        dbErrorType,
      },
      rethrow: false,
    });

    // Add database-specific fields
    errorResponse.dbErrorType = dbErrorType;
    errorResponse.userMessage = getDbUserMessage(error, dbErrorType);
    errorResponse.recoverable = isDbErrorRecoverable(error, dbErrorType);

    return { error: errorResponse, result: null };
  }
}

/**
 * Safe database operation wrapper with default value
 */
export async function safeDbOperation(dbOperation, defaultValue = null, context = {}) {
  const result = await withDbErrorHandler(dbOperation, context);
  
  if (result.error) {
    console.warn('[safeDbOperation] Returning default value due to error:', result.error.message);
    return defaultValue;
  }
  
  return result;
}

/**
 * Retry database operation
 */
export async function retryDbOperation(dbOperation, options = {}) {
  const {
    maxRetries = 3,
    delay = 500,
    context = {},
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await dbOperation();
    } catch (error) {
      lastError = error;
      const dbErrorType = classifyDbError(error);

      // Don't retry non-recoverable errors
      if (!isDbErrorRecoverable(error, dbErrorType)) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(
          `[retryDbOperation] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  handleError(lastError, {
    severity: Severity.ERROR,
    context: {
      ...context,
      attempts: maxRetries + 1,
    },
  });

  throw lastError;
}

/**
 * Batch database operations with error handling
 */
export async function batchDbOperations(operations, options = {}) {
  const {
    stopOnError = false,
    onProgress = null,
    context = {},
  } = options;

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await operations[i]();
      results.push({ success: true, result });
      successCount++;
    } catch (error) {
      const errorResponse = handleError(error, {
        severity: Severity.WARN,
        context: {
          ...context,
          operationIndex: i,
        },
      });

      results.push({ success: false, error: errorResponse });
      errorCount++;

      if (stopOnError) {
        break;
      }
    }

    if (onProgress) {
      onProgress(i + 1, operations.length, successCount, errorCount);
    }
  }

  return {
    results,
    successCount,
    errorCount,
    totalCount: operations.length,
  };
}

export default {
  DbErrorType,
  classifyDbError,
  getDbUserMessage,
  isDbErrorRecoverable,
  withDbErrorHandler,
  safeDbOperation,
  retryDbOperation,
  batchDbOperations,
};
