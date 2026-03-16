import * as React from "react";
import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        matchRoutes,
        createRoutesFromChildren,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
    tracePropagationTargets: ["localhost", window.location.origin],
    replaysSessionSampleRate: import.meta.env.DEV ? 0.2 : 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

