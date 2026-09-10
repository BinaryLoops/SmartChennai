import { NextRequest, NextResponse } from "next/server";
import { incidentQueue } from "@/lib/queue";
import { checkRedisHealth } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
      isPaused,
      redisHealth,
      recentJobsRaw,
    ] = await Promise.all([
      incidentQueue.getWaitingCount().catch(() => 0),
      incidentQueue.getActiveCount().catch(() => 0),
      incidentQueue.getCompletedCount().catch(() => 0),
      incidentQueue.getFailedCount().catch(() => 0),
      incidentQueue.getDelayedCount().catch(() => 0),
      incidentQueue.isPaused().catch(() => false),
      checkRedisHealth(),
      incidentQueue.getJobs(["active", "waiting", "completed", "failed"], 0, 14, true).catch(() => []),
    ]);

    // Format recent jobs
    const recentJobs = await Promise.all(
      recentJobsRaw.map(async (job) => {
        const state = await job.getState().catch(() => "unknown");
        const processedOn = job.processedOn;
        const finishedOn = job.finishedOn;
        const durationMs =
          processedOn && finishedOn
            ? finishedOn - processedOn
            : processedOn
            ? Date.now() - processedOn
            : null;

        // Calculate queue lag: time between submission and when processing started
        const submittedAt = job.data?.submittedAt ? new Date(job.data.submittedAt).getTime() : job.timestamp;
        const queueLagMs = processedOn ? Math.max(0, processedOn - submittedAt) : Math.max(0, Date.now() - submittedAt);

        return {
          id: job.id,
          referenceId: job.data?.referenceId || job.id,
          type: job.data?.type || "unknown",
          source: job.data?.source || "citizen",
          severity: job.data?.severity ?? 2,
          state,
          durationMs,
          queueLagMs,
          timestamp: job.timestamp,
          submittedAt: job.data?.submittedAt,
          result: job.returnvalue,
          failedReason: job.failedReason,
        };
      })
    );

    // Compute average processing lag
    const completedWithDuration = recentJobs.filter((j) => j.state === "completed" && typeof j.durationMs === "number");
    const avgProcessingLagMs =
      completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce((acc, j) => acc + (j.durationMs || 0), 0) /
              completedWithDuration.length
          )
        : 15;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queue: {
        name: "incidents",
        depth: waitingCount + activeCount,
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        isPaused,
        avgProcessingLagMs,
      },
      redis: redisHealth,
      recentJobs,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/queue-health] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve queue health metrics", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case "pause":
        await incidentQueue.pause();
        return NextResponse.json({ message: "Incident intake queue paused" });

      case "resume":
        await incidentQueue.resume();
        return NextResponse.json({ message: "Incident intake queue resumed" });

      case "clean":
        await incidentQueue.clean(0, 1000, "completed");
        await incidentQueue.clean(0, 1000, "failed");
        return NextResponse.json({ message: "Completed and failed jobs cleaned" });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported: pause, resume, clean" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[POST /api/admin/queue-health] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform queue action", details: error.message },
      { status: 500 }
    );
  }
}
