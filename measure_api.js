const http = require('http');

function checkSize(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let size = 0;
      res.on('data', (chunk) => { size += chunk.length; });
      res.on('end', () => {
        resolve({ url, size, status: res.statusCode });
      });
    }).on('error', (e) => resolve({ url, error: e.message }));
  });
}

async function run() {
  const endpoints = [
    'http://localhost:3001/api/traffic/overview',
    'http://localhost:3001/api/water/overview',
    'http://localhost:3001/api/energy/assets',
    'http://localhost:3001/api/waste/overview',
    'http://localhost:3001/api/predictions/overview',
    'http://localhost:3001/api/predictions/risks',
    'http://localhost:3001/api/events/live',
    'http://localhost:3001/api/transit/routes'
  ];
  
  console.log("Measuring API Response Sizes (Port 3001)...");
  for (const url of endpoints) {
    const result = await checkSize(url);
    console.log(`${url.padEnd(50)} : ${result.size ? (result.size / 1024).toFixed(2) + ' KB' : (result.error || result.status)}`);
  }
}
run();
