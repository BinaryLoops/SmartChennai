import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { incidentQueue } from "@/lib/queue";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

// Validation schema for citizen and system incident reports
const incidentSubmissionSchema = z.object({
  type: z.enum(["traffic", "fire", "medical", "flood"], {
    errorMap: () => ({ message: "Incident type must be traffic, fire, medical, or flood" }),
  }),
  lat: z
    .number({ invalid_type_error: "Latitude must be a valid number" })
    .min(12.75, "Latitude must be within Greater Chennai metropolitan bounds (12.75 to 13.40)")
    .max(13.40, "Latitude must be within Greater Chennai metropolitan bounds (12.75 to 13.40)"),
  lng: z
    .number({ invalid_type_error: "Longitude must be a valid number" })
    .min(79.90, "Longitude must be within Greater Chennai metropolitan bounds (79.90 to 80.45)")
    .max(80.45, "Longitude must be within Greater Chennai metropolitan bounds (79.90 to 80.45)"),
  severity: z
    .number()
    .int()
    .min(1, "Severity must be between 1 and 5")
    .max(5, "Severity must be between 1 and 5")
    .optional(),
  source: z.enum(["citizen", "sensor", "department"]).optional().default("citizen"),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * POST /api/incidents
 * Citizen & sensor scalable incident intake endpoint.
 *
 * Strict Architecture:
 * 1. Rate limiting (100 requests per 15 min per IP)
 * 2. Payload & coordinate validation
 * 3. Enqueues job to BullMQ "incidents" queue
 * 4. Returns HTTP 202 Accepted immediately with generated reference ID
 * (ZERO direct PostgreSQL writes here)
 */
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    // 1. Rate limiting check (100 req / 15 min)
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 100 incident reports per 15 minutes.",
          retryAfter: rateLimit.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetInSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    // 2. Validate payload
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload" },
        { status: 400 }
      );
    }

    const validationResult = incidentSubmissionSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid incident submission",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Generate reference ID (e.g. INC-1725800000000-X7K2P9)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referenceId = `INC-${timestamp}-${randomSuffix}`;

    // 4. Push job into BullMQ "incidents" queue
    await incidentQueue.add(
      "intake-job",
      {
        referenceId,
        type: data.type,
        lat: data.lat,
        lng: data.lng,
        severity: data.severity ?? 2,
        source: data.source,
        description: data.description,
        clientIp,
        submittedAt: new Date().toISOString(),
      },
      {
        jobId: referenceId, // Idempotency
      }
    );

    // 5. Return HTTP 202 Accepted immediately
    return NextResponse.json(
      {
        status: "accepted",
        referenceId,
        message: "Incident report accepted and queued for asynchronous processing",
        estimatedProcessingTimeMs: 50,
      },
      {
        status: 202,
        headers: {
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetInSeconds),
        },
      }
    );
  } catch (error: any) {
    console.error("[POST /api/incidents] Internal Error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing incident intake" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents?referenceId=INC-...
 * Look up status of a submitted incident by referenceId or list recent incidents.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceId = searchParams.get("referenceId");

    if (referenceId) {
      const incident = await prisma.incident.findUnique({
        where: { referenceId },
        include: { unit: true },
      });

      if (!incident) {
        // Check if job is still waiting in queue
        const job = await incidentQueue.getJob(referenceId);
        if (job) {
          const state = await job.getState();
          return NextResponse.json({
            status: "queued",
            queueState: state,
            referenceId,
            submittedAt: job.data.submittedAt,
          });
        }

        return NextResponse.json(
          { error: "Incident reference ID not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: "processed",
        incident,
      });
    }

    // Default: return recent 50 incidents
    const incidents = await prisma.incident.findMany({
      orderBy: { reportedAt: "desc" },
      take: 50,
      include: { unit: true },
    });

    return NextResponse.json({ incidents });
  } catch (error: any) {
    console.error("[GET /api/incidents] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve incidents" },
      { status: 500 }
    );
  }
}
