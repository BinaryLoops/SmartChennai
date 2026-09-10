/**
 * Phase 4.5 — Scalable Incident Intake Load Test.
 *
 * Simulates 5,000 concurrent citizen submissions targeting POST /api/incidents using autocannon.
 * Evaluates queue throughput, ingestion latency, and rate-limiting behavior.
 *
 * Usage:
 *   npx tsx scripts/load-test.ts
 *   or: npm run load-test
 */

import autocannon from "autocannon";

const TARGET_URL = process.env.TARGET_URL || "http://localhost:3000/api/incidents";
const TOTAL_REQUESTS = Number(process.env.LOAD_TEST_AMOUNT || 5000);
const CONCURRENT_CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS || 100);

// Key Chennai reference hubs for generating realistic coordinates
const CHENNAI_HUBS = [
  { name: "Marina Beach", lat: 13.0500, lng: 80.2824 },
  { name: "T. Nagar", lat: 13.0418, lng: 80.2341 },
  { name: "Guindy Junction", lat: 13.0067, lng: 80.2036 },
  { name: "Central Railway", lat: 13.0827, lng: 80.2707 },
  { name: "Adyar", lat: 13.0012, lng: 80.2565 },
  { name: "Anna Nagar", lat: 13.0850, lng: 80.2100 },
  { name: "OMR Sholinganallur", lat: 12.9010, lng: 80.2279 },
  { name: "Koyambedu", lat: 13.0694, lng: 80.1948 },
];

const INCIDENT_TYPES = ["traffic", "fire", "medical", "flood"] as const;

const DESCRIPTIONS = [
  "Waterlogging on main carriageway causing severe gridlock",
  "Two-wheeler collision blocking intersection lane",
  "High flood water levels rising rapidly near canal",
  "Small electrical transformer fire reported on sidewalk",
  "Medical assistance requested for dehydrated commuter",
  "Stalled heavy goods vehicle causing multi-km backup",
];

function generateRandomPayload() {
  const hub = CHENNAI_HUBS[Math.floor(Math.random() * CHENNAI_HUBS.length)];
  // Slight jitter: +- 200 meters (~0.002 degrees)
  const lat = +(hub.lat + (Math.random() - 0.5) * 0.004).toFixed(6);
  const lng = +(hub.lng + (Math.random() - 0.5) * 0.004).toFixed(6);
  const type = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
  const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
  const severity = 1 + Math.floor(Math.random() * 5);

  return JSON.stringify({
    type,
    lat,
    lng,
    severity,
    source: "citizen",
    description,
  });
}

async function runLoadTest() {
  console.log("==========================================================");
  console.log("  SMART CHENNAI ICCC — PHASE 4.5 INTAKE LOAD TEST");
  console.log("==========================================================");
  console.log(`Target URL        : ${TARGET_URL}`);
  console.log(`Total Requests    : ${TOTAL_REQUESTS}`);
  console.log(`Connections       : ${CONCURRENT_CONNECTIONS}`);
  console.log(`Timestamp         : ${new Date().toISOString()}`);
  console.log("----------------------------------------------------------\n");

  let status202Count = 0;
  let status429Count = 0;
  let otherStatusCount = 0;

  const instance = autocannon(
    {
      url: TARGET_URL,
      method: "POST",
      amount: TOTAL_REQUESTS,
      connections: CONCURRENT_CONNECTIONS,
      headers: {
        "content-type": "application/json",
      },
      // Randomize client IP across requests to test distributed citizen intake
      setupClient: (client) => {
        client.on("response", (status) => {
          if (status === 202) {
            status202Count += 1;
          } else if (status === 429) {
            status429Count += 1;
          } else {
            otherStatusCount += 1;
          }
        });

        client.setHeadersAndBody(
          {
            "content-type": "application/json",
            "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(
              Math.random() * 250
            )}.${Math.floor(Math.random() * 250)}`,
          },
          generateRandomPayload()
        );
      },
    },
    (err, result) => {
      if (err) {
        console.error("[load-test] Autocannon error:", err);
        return;
      }
      console.log("\n==========================================================");
      console.log("  LOAD TEST COMPLETED — RESULTS SUMMARY");
      console.log("==========================================================");
      console.log(`Total Duration        : ${result.duration.toFixed(2)}s`);
      console.log(`Total Requests Sent   : ${result.requests.total}`);
      console.log(`Avg Throughput        : ${result.requests.average.toFixed(1)} req/sec`);
      console.log(`Peak Throughput       : ${result.requests.max} req/sec`);
      console.log("----------------------------------------------------------");
      console.log(`Latency (Avg)         : ${result.latency.average.toFixed(2)} ms`);
      console.log(`Latency (p50)         : ${result.latency.p50} ms`);
      console.log(`Latency (p90)         : ${result.latency.p90} ms`);
      console.log(`Latency (p97.5)       : ${result.latency.p97_5} ms`);
      console.log(`Latency (p99)         : ${result.latency.p99} ms`);
      console.log("----------------------------------------------------------");
      console.log(`HTTP 202 Accepted     : ${status202Count} (${((status202Count / result.requests.total) * 100).toFixed(1)}%)`);
      console.log(`HTTP 429 Rate-Limited : ${status429Count}`);
      console.log(`Other Status Codes    : ${otherStatusCount}`);
      console.log(`Socket / Conn Errors  : ${result.errors}`);
      console.log(`Timeouts              : ${result.timeouts}`);
      console.log("==========================================================\n");

      if (result.errors === 0 && (status202Count + status429Count) === result.requests.total) {
        console.log("✔ SUCCESS: All requests absorbed cleanly into BullMQ intake queue or rate-limited.");
      } else {
        console.log("⚠ Notice: Some errors or timeouts occurred during test execution.");
      }
    }
  );

  autocannon.track(instance, { renderProgressBar: true });
}

if (require.main === module) {
  runLoadTest().catch((err) => {
    console.error("[load-test] Fatal error:", err);
    process.exit(1);
  });
}
