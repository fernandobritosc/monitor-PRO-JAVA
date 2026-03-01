import * as Sentry from "@sentry/react";
import posthog from 'posthog-js';

export const initTelemetry = () => {
    // Sentry Initialization
    // DSN should be replaced with real value from .env
    const sentryDsn = (import.meta as any).env.VITE_SENTRY_DSN || "";

    if (sentryDsn) {
        Sentry.init({
            dsn: sentryDsn,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0,
            // Session Replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
        });
    }

    // PostHog Initialization
    const posthogKey = (import.meta as any).env.VITE_POSTHOG_KEY || "";
    const posthogHost = (import.meta as any).env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

    if (posthogKey) {
        posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            capture_pageview: true,
        });
    }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (posthog.isFeatureEnabled('telemetry')) { // Optional toggle
        posthog.capture(eventName, properties);
    } else {
        posthog.capture(eventName, properties);
    }
};

export const identifyUser = (userId: string, email: string) => {
    Sentry.setUser({ id: userId, email });
    posthog.identify(userId, { email });
};

export const captureError = (error: any, context?: any) => {
    console.error("Capture Error:", error, context);
    Sentry.captureException(error, { extra: context });
};
