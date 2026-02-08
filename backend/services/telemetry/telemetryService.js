// ============================================================================
// 📡 telemetryService
// ----------------------------------------------------------------------------
// Single telemetry gateway (channel-agnostic).
// - No cognition
// - No PII leakage (keep it minimal)
// ============================================================================

export async function trackEvent(eventName, payload = {}) {
  try {
    // TODO: Replace with your provider (PostHog, Datadog, Sentry, Elastic, etc.)
    // For now: safe console log in dev only
    if (process.env.NODE_ENV !== "production") {
      console.log("📡 [telemetry]", eventName, payload);
    }
  } catch {
    // noop
  }
}

export default { trackEvent };
