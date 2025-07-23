// This file configures the initialization of Sentry on the browser/client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Configure tags and context
  beforeSend(event, hint) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      component: 'client',
    };

    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      // You can filter out certain errors in development
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error &&
            typeof error.message === 'string' &&
            error.message.includes('ResizeObserver loop limit exceeded')) {
          return null; // Don't send this error to Sentry
        }
      }
    }

    return event;
  },

  // Set user context
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV,
      platform: 'nextjs-client',
    },
  },
});
