import * as Sentry from "@sentry/nextjs";

// Custom error types for better categorization
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  GENERATION = 'generation',
  SUBSCRIPTION = 'subscription',
  API = 'api',
  UI = 'ui',
  PAYMENT = 'payment',
}

// Set user context for Sentry
export function setSentryUser(user: {
  id: string;
  email?: string;
  subscription_plan?: string;
  daily_generations_used?: number;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    subscription_plan: user.subscription_plan,
    daily_generations_used: user.daily_generations_used,
  });

  // Set additional context
  Sentry.setTag('subscription_plan', user.subscription_plan || 'unknown');
  Sentry.setContext('user_stats', {
    daily_generations_used: user.daily_generations_used || 0,
    subscription_plan: user.subscription_plan || 'unknown',
  });
}

// Track custom events
export function trackEvent(eventName: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: eventName,
    category: 'custom',
    level: 'info',
    data,
  });
}

// Track generation attempts
export function trackGeneration(data: {
  prompt: string;
  variation: number;
  framework?: string;
  userId: string;
  success: boolean;
  error?: string;
}) {
  Sentry.addBreadcrumb({
    message: 'Generation attempt',
    category: 'generation',
    level: data.success ? 'info' : 'error',
    data: {
      prompt_length: data.prompt.length,
      variation: data.variation,
      framework: data.framework,
      userId: data.userId,
      success: data.success,
      error: data.error,
    },
  });

  // Track as custom event (metrics API not available in this version)
  Sentry.addBreadcrumb({
    message: data.success ? 'Generation success' : 'Generation failure',
    category: 'metric',
    level: 'info',
    data: {
      metric_type: data.success ? 'generation.success' : 'generation.failure',
      framework: data.framework || 'unknown',
      variation: data.variation.toString(),
      error_type: data.error || 'unknown',
    },
  });
}

// Track authentication events
export function trackAuth(event: 'login' | 'logout' | 'signup' | 'error', data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Auth: ${event}`,
    category: 'auth',
    level: event === 'error' ? 'error' : 'info',
    data,
  });

  // Track as custom event
  Sentry.addBreadcrumb({
    message: `Auth metric: ${event}`,
    category: 'metric',
    level: 'info',
    data: {
      metric_type: `auth.${event}`,
      ...data,
    },
  });
}

// Track subscription events
export function trackSubscription(event: 'upgrade' | 'downgrade' | 'cancel' | 'renew', data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Subscription: ${event}`,
    category: 'subscription',
    level: 'info',
    data,
  });

  // Track as custom event
  Sentry.addBreadcrumb({
    message: `Subscription metric: ${event}`,
    category: 'metric',
    level: 'info',
    data: {
      metric_type: `subscription.${event}`,
      plan: data?.plan || 'unknown',
      ...data,
    },
  });
}

// Capture error with context
export function captureError(error: Error, category: ErrorCategory, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', category);
    if (context) {
      scope.setContext('error_context', context);
    }
    Sentry.captureException(error);
  });
}

// Capture message with context
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('message_context', context);
    }
    Sentry.captureMessage(message, level);
  });
}

// Performance monitoring helpers
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, () => {
    // Return a span-like object for compatibility
    return {
      finish: () => {},
      setTag: () => {},
      setData: () => {},
    };
  });
}

// Track page performance
export function trackPageLoad(pageName: string, loadTime: number) {
  Sentry.addBreadcrumb({
    message: `Page load: ${pageName}`,
    category: 'performance',
    level: 'info',
    data: {
      metric_type: 'page.load_time',
      page: pageName,
      load_time: loadTime,
    },
  });
}

// Track API performance
export function trackApiCall(endpoint: string, method: string, duration: number, status: number) {
  Sentry.addBreadcrumb({
    message: `API call: ${method} ${endpoint}`,
    category: 'api',
    level: status >= 400 ? 'error' : 'info',
    data: {
      metric_type: 'api.duration',
      endpoint,
      method,
      duration,
      status,
    },
  });
}
