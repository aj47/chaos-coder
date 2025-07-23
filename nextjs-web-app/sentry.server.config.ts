// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
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
      component: 'server',
    };

    // Add server-specific context
    if (event.request) {
      event.tags.route = event.request.url;
    }

    return event;
  },

  // Set server context
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV,
      platform: 'nextjs-server',
    },
  },

  // Configure integrations for server
  integrations: [
    // Add server-specific integrations here
  ],
});
