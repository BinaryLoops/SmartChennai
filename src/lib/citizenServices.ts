/**
 * STAR #10 — Citizen Service Intelligence
 * Shared routing configuration and SLA policy.
 * Transparent, typed, single source of truth.
 */

import { ServiceCategory } from "@prisma/client";

export interface ServiceRoute {
  department: string;
  createsWorkOrder: boolean;
  escalatesToIncident: boolean; // only for high-severity conditions
  slaDays: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
}

export const SERVICE_ROUTING: Record<ServiceCategory, ServiceRoute> = {
  ROAD: {
    department: "Public Works",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 },
  },
  WATER: {
    department: "Water Operations",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 },
  },
  DRAINAGE: {
    department: "Water / Public Works",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 },
  },
  STREETLIGHT: {
    department: "Energy / Public Works",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.25 },
  },
  WASTE: {
    department: "Waste Operations",
    createsWorkOrder: false,
    escalatesToIncident: false,
    slaDays: { LOW: 3, MEDIUM: 2, HIGH: 1, CRITICAL: 0.5 },
  },
  TRAFFIC: {
    department: "Traffic Operations",
    createsWorkOrder: false,
    escalatesToIncident: false,
    slaDays: { LOW: 5, MEDIUM: 2, HIGH: 0.5, CRITICAL: 0.1 },
  },
  CCTV: {
    department: "Security / Operations",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 },
  },
  PUBLIC_FACILITY: {
    department: "Public Works",
    createsWorkOrder: true,
    escalatesToIncident: false,
    slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 },
  },
  TRANSIT: {
    department: "Transit Operations",
    createsWorkOrder: false,
    escalatesToIncident: false,
    slaDays: { LOW: 5, MEDIUM: 2, HIGH: 1, CRITICAL: 0.5 },
  },
  OTHER: {
    department: "Citizen Services",
    createsWorkOrder: false,
    escalatesToIncident: false,
    slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 },
  },
};

export type SlaStatus = "ON_TRACK" | "AT_RISK" | "BREACHED" | "RESOLVED";

export function calculateSlaStatus(
  status: string,
  slaDueAt: Date | null,
  resolvedAt: Date | null
): SlaStatus {
  if (status === "RESOLVED" || status === "CLOSED") return "RESOLVED";
  if (!slaDueAt) return "ON_TRACK";

  const now = Date.now();
  const due = slaDueAt.getTime();
  const resolved = resolvedAt?.getTime();

  if (resolved) {
    return resolved <= due ? "RESOLVED" : "RESOLVED"; // breached but completed
  }

  const remaining = due - now;
  if (remaining < 0) return "BREACHED";
  // AT_RISK if less than 20% of the SLA window remains
  const total = due - (slaDueAt.getTime() - 24 * 3600 * 1000); // rough
  if (remaining < total * 0.2) return "AT_RISK";
  return "ON_TRACK";
}

export function computeSlaDueAt(
  category: ServiceCategory,
  priority: string,
  submittedAt: Date
): Date {
  const route = SERVICE_ROUTING[category];
  const days = route.slaDays[priority as keyof typeof route.slaDays] ?? 7;
  const due = new Date(submittedAt.getTime() + days * 24 * 3600 * 1000);
  return due;
}

/** Determine priority from description keywords + category */
export function inferPriority(category: ServiceCategory, description: string): string {
  const desc = description.toLowerCase();
  if (
    desc.includes("danger") || desc.includes("urgent") || desc.includes("emergency") ||
    desc.includes("flood") || desc.includes("fire") || desc.includes("accident")
  ) {
    return "HIGH";
  }
  if (desc.includes("multiple") || desc.includes("many") || desc.includes("widespread")) {
    return "HIGH";
  }
  if (category === "WATER" || category === "DRAINAGE") return "MEDIUM";
  if (category === "ROAD") return "MEDIUM";
  return "MEDIUM";
}

/** Generate a service request reference code */
export function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SC-${year}-${rand}`;
}
