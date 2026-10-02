import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const feedbackSchema = z.object({
  requestId: z.string(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
  sessionToken: z.string().min(10).max(128),
});

/**
 * POST /api/citizen/feedback
 * Submit satisfaction rating for a resolved/closed service request.
 * Only allowed after RESOLVED or CLOSED status.
 */
export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = feedbackSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { requestId, rating, feedback, sessionToken } = parsed.data;

    const request = await prisma.citizenServiceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, sessionToken: true, status: true, rating: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Privacy: enforce session ownership
    if (request.sessionToken && request.sessionToken !== sessionToken) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only allow after resolution
    if (request.status !== "RESOLVED" && request.status !== "CLOSED") {
      return NextResponse.json(
        { error: "Feedback is only allowed after the request is resolved." },
        { status: 409 }
      );
    }

    // Prevent duplicate rating
    if (request.rating !== null) {
      return NextResponse.json(
        { error: "Feedback already submitted for this request." },
        { status: 409 }
      );
    }

    await prisma.citizenServiceRequest.update({
      where: { id: requestId },
      data: {
        rating,
        ratingFeedback: feedback ?? null,
        ratedAt: new Date(),
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    await prisma.serviceRequestUpdate.create({
      data: {
        requestId,
        status: "CLOSED",
        note: `Citizen rated: ${rating}/5${feedback ? " — " + feedback : ""}`,
      },
    });

    return NextResponse.json({ success: true, rating });
  } catch (err: any) {
    console.error("[POST /api/citizen/feedback]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
