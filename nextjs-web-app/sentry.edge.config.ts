// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used whenever a page or API route is going to be run in an edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Configure tags and context
  beforeSend(event, hint) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      component: 'edge',
    };

    return event;
  },

  // Set edge context
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV,
      platform: 'nextjs-edge',
    },
  },
});
