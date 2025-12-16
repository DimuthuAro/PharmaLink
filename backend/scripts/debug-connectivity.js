const http = require('http');

const check = (name, port, path) => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${name}] ${path} -> Status: ${res.statusCode}`);
        resolve(res.statusCode);
      });
    });
    req.on('error', (e) => {
      console.log(`[${name}] ${path} -> Error: ${e.message}`);
      resolve(null);
    });
    req.end();
  });
};

async function run() {
  console.log('--- Testing Backend Connectivity ---');

  // 1. Check Gateway Root/Health
  await check('Gateway', 3000, '/health');

  // 2. Check Microservice Direct
  await check('Microservice Direct', 3001, '/health');

  // 3. Check Microservice via Gateway Proxy
  await check('Microservice via Gateway', 3000, '/api/drug-interactions/health');

  // 4. Check Microservice via Gateway Proxy (POST endpoint check)
  await new Promise((resolve) => {
    const postData = JSON.stringify({ drugs: ['Aspirin', 'Warfarin'] });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/drug-interactions/check-interactions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      console.log(`[Microservice POST via Gateway] /api/drug-interactions/check-interactions -> Status: ${res.statusCode}`);
      res.on('data', () => { }); // Consume data
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', (e) => {
      console.log(`[Microservice POST via Gateway] Error: ${e.message}`);
      resolve(null);
    });
    req.write(postData);
    req.end();
  });

  // 5. Check Microservice Direct (POST endpoint check)
  await new Promise((resolve) => {
    const postData = JSON.stringify({ drugs: ['Aspirin', 'Warfarin'] });
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/check-interactions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      console.log(`[Microservice POST Direct] /check-interactions -> Status: ${res.statusCode}`);
      res.on('data', () => { }); // Consume data
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', (e) => {
      console.log(`[Microservice POST Direct] Error: ${e.message}`);
      resolve(null);
    });
    req.write(postData);
    req.end();
  });
}

run();
