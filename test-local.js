async function run() {
  console.log("Sending request to CCTV generate (local mode)...");
  try {
    const res = await fetch('http://localhost:3001/api/cctv/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId: 'CAM-KTP-01', locationName: 'Kathipara', congestion: 50, vehiclesPerHour: 1000 })
    });
    const generateData = await res.json();
    console.log('Generate Response:', generateData);

    if (generateData.jobId) {
       const statusRes = await fetch(`http://localhost:3001/api/cctv/status?jobId=${generateData.jobId}`);
       const statusData = await statusRes.json();
       console.log('Status Response:', statusData);
    }

  } catch (e) {
    console.error('Fetch Error:', e);
  }
}

run();
