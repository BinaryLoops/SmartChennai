async function run() {
  console.log("Sending request to CCTV generate...");
  try {
    const res = await fetch('http://localhost:3000/api/cctv/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cameraId: 'CAM_TEST_1', locationName: 'Test Junction', congestion: 50, vehiclesPerHour: 1000 })
    });
    
    const text = await res.text();
    console.log('HTTP', res.status);
    console.log('Response:', text);
  } catch (e) {
    console.error('Fetch Error:', e);
  }
}

run();
