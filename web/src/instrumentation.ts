// Runs once when the server starts. Starts the background loop (escalation and notification delivery).
// Single-process by design (one lab server). On serverless hosting, call POST /api/jobs/run from a cron instead
// and set BACKGROUND_JOBS=off.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.BACKGROUND_JOBS === "off") return;
  const g = globalThis as { __jobsTimer?: NodeJS.Timeout };
  if (g.__jobsTimer) return; // development reloads must not start a second loop
  const { runJobs } = await import("@/lib/jobs");
  const tick = async () => {
    try {
      await runJobs();
    } catch (e) {
      console.error("[jobs] pass failed:", e instanceof Error ? e.message : e);
    }
  };
  g.__jobsTimer = setInterval(tick, 15_000);
  g.__jobsTimer.unref?.();
}
