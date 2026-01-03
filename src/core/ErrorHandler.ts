/**
 * ErrorHandler - Centralized error handling for the application
 * 
 * Provides:
 * - Consistent error logging
 * - Error categorization by context
 * - Future-ready for external error reporting (Sentry, LogRocket, etc.)
 */
export class ErrorHandler {
  /** Whether to log errors to console (disable in tests) */
  static verbose = true;

  /**
   * Handle an error with context information.
   * Logs to console and could be extended to send to external services.
   * 
   * @param error The error that occurred
   * @param context A descriptive context (e.g., 'scene-startup', 'api-fetch')
   * @param metadata Optional additional data for debugging
   */
  static handle(
    error: unknown,
    context: string,
    metadata?: Record<string, unknown>
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (this.verbose) {
      console.error(`[${context}] ${errorMessage}`);
      if (errorStack) {
        console.error(errorStack);
      }
      if (metadata) {
        console.error('Metadata:', metadata);
      }
    }

    // Future: Send to external error reporting service
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     tags: { context },
    //     extra: metadata,
    //   });
    // }
  }

  /**
   * Wrap an async function with error handling.
   * Useful for one-off operations that should not crash the app.
   * 
   * @param fn The async function to wrap
   * @param context Error context for logging
   * @returns The result or undefined if an error occurred
   */
  static async wrap<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return undefined;
    }
  }

  /**
   * Retry an async operation with exponential backoff.
   * Useful for network requests that may fail transiently.
   * 
   * @param fn The async function to retry
   * @param context Error context for logging
   * @param maxAttempts Maximum number of attempts (default: 3)
   * @param initialDelay Initial delay in ms (default: 1000)
   * @returns The result or throws after all attempts fail
   */
  static async retry<T>(
    fn: () => Promise<T>,
    context: string,
    maxAttempts = 3,
    initialDelay = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          if (this.verbose) {
            console.warn(
              `[${context}] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`
            );
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    this.handle(lastError, context, { attempts: maxAttempts });
    throw lastError;
  }
}


