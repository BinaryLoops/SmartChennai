/**
 * End-to-End API Test for POST /api/incidents
 */

async function testApi() {
  console.log("=== Testing POST /api/incidents ===");

  const payload1 = {
    type: "traffic",
    lat: 13.0827,
    lng: 80.2707,
    severity: 3,
    source: "citizen",
    description: "Heavy multi-car pileup near Chennai Central station",
  };

  const res1 = await fetch("http://localhost:3000/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload1),
  });

  const data1 = await res1.json();
  console.log(`Report 1 Status: ${res1.status} (Expected 202)`);
  console.log("Response Body:", data1);

  if (res1.status !== 202 || !data1.referenceId) {
    throw new Error("Report 1 failed");
  }

  // Wait 1.5 seconds for intake worker to process the BullMQ job
  console.log("\nWaiting 2s for worker to process job...");
  await new Promise((r) => setTimeout(r, 2000));

  // Verify status lookup via GET /api/incidents?referenceId=...
  const statusRes = await fetch(`http://localhost:3000/api/incidents?referenceId=${data1.referenceId}`);
  const statusData = await statusRes.json();
  console.log("\nLookup by referenceId:", statusData);

  // Send duplicate report within 25m (~0.0002 deg)
  console.log("\n=== Sending duplicate report 25m away ===");
  const payload2 = {
    type: "traffic",
    lat: 13.08285,
    lng: 80.2708,
    severity: 4, // Higher severity
    source: "citizen",
    description: "Another commuter reporting the same pileup at Central",
  };

  const res2 = await fetch("http://localhost:3000/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload2),
  });

  const data2 = await res2.json();
  console.log(`Report 2 Status: ${res2.status} (Expected 202)`);
  console.log("Report 2 Response Body:", data2);

  // Wait 2 seconds for worker to merge duplicate
  console.log("\nWaiting 2s for worker to merge duplicate...");
  await new Promise((r) => setTimeout(r, 2000));

  // Check queue health API
  console.log("\n=== Checking GET /api/admin/queue-health ===");
  const healthRes = await fetch("http://localhost:3000/api/admin/queue-health");
  const healthData = await healthRes.json();
  console.log("Queue Health Status:", {
    depth: healthData.queue?.depth,
    completed: healthData.queue?.completed,
    recentJobsCount: healthData.recentJobs?.length,
    latestJobResult: healthData.recentJobs?.[0]?.result,
  });

  console.log("\n✔ E2E API Verification Complete!");
}

testApi().catch((err) => {
  console.error("Test API error:", err);
  process.exit(1);
});
