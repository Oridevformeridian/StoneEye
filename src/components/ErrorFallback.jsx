import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorFallback Component
 * 
 * Default fallback UI shown when an ErrorBoundary catches an error.
 * Displays user-friendly error message with recovery options.
 */
const ErrorFallback = ({ error, errorInfo, onReset, resetLabel, showDetails }) => {
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur border border-red-500/20 rounded-lg shadow-2xl p-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-300 mb-4">
            The application encountered an unexpected error. Don't worry, your data is safe.
          </p>
        </div>

        {/* Error Details (Dev Mode) */}
        {isDev && error && (
          <div className="mb-6 bg-gray-900/50 border border-gray-700 rounded p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Error Details:</h3>
            <p className="text-sm text-red-400 font-mono mb-2">{error.toString()}</p>
            {errorInfo && errorInfo.componentStack && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  Component Stack
                </summary>
                <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* User-Friendly Error Info */}
        {!isDev && (
          <div className="mb-6 bg-gray-900/30 border border-gray-700 rounded p-4">
            <p className="text-sm text-gray-400">
              We apologize for the inconvenience. You can try refreshing the page or 
              returning to the home screen. If the problem persists, please report this issue.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {resetLabel}
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <a
              href="https://github.com/Oridevformeridian/StoneEye/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Report this issue on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

ErrorFallback.propTypes = {
  error: PropTypes.instanceOf(Error),
  errorInfo: PropTypes.shape({
    componentStack: PropTypes.string,
  }),
  onReset: PropTypes.func.isRequired,
  resetLabel: PropTypes.string,
  showDetails: PropTypes.bool,
};

ErrorFallback.defaultProps = {
  error: null,
  errorInfo: null,
  resetLabel: 'Try Again',
  showDetails: false,
};

export default ErrorFallback;
