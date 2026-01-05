/**
 * Test ML Connection
 * Run: node test-ml-connection.js
 * Make sure Python ML service is running first: python ml_service/main.py
 */

const http = require('http');

const tests = {
    // Test 1: ML Service Health
    async testMLHealth() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 8000,
                path: '/health',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        test: 'ML Service Health',
                        status: res.statusCode === 200 ? 'PASS' : 'FAIL',
                        response: JSON.parse(data)
                    });
                });
            });
            req.on('error', (e) => resolve({ test: 'ML Service Health', status: 'FAIL', error: e.message }));
            req.end();
        });
    },

    // Test 2: Express API Health
    async testExpressHealth() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/health',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        test: 'Express API Health',
                        status: res.statusCode === 200 ? 'PASS' : 'FAIL',
                        response: JSON.parse(data)
                    });
                });
            });
            req.on('error', (e) => resolve({ test: 'Express API Health', status: 'FAIL', error: e.message }));
            req.end();
        });
    },

    // Test 3: ML via Express
    async testMLViaExpress() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/ml/health',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        test: 'ML via Express Gateway',
                        status: res.statusCode === 200 ? 'PASS' : 'FAIL',
                        response: JSON.parse(data)
                    });
                });
            });
            req.on('error', (e) => resolve({ test: 'ML via Express Gateway', status: 'FAIL', error: e.message }));
            req.end();
        });
    },

    // Test 4: Drug Interactions
    async testInteractions() {
        return new Promise((resolve) => {
            const postData = JSON.stringify({ drugs: ['Warfarin', 'Aspirin'] });
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/ml/interactions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const response = JSON.parse(data);
                    resolve({
                        test: 'Drug Interactions (Warfarin + Aspirin)',
                        status: res.statusCode === 200 && response.success ? 'PASS' : 'FAIL',
                        response
                    });
                });
            });
            req.on('error', (e) => resolve({ test: 'Drug Interactions', status: 'FAIL', error: e.message }));
            req.write(postData);
            req.end();
        });
    }
};

async function runTests() {
    console.log('\n🧪 PharmaLink ML Connection Test\n');
    console.log('='.repeat(50));

    const results = [];

    for (const [name, test] of Object.entries(tests)) {
        const result = await test();
        results.push(result);

        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`\n${icon} ${result.test}: ${result.status}`);

        if (result.status === 'PASS') {
            console.log('   Response:', JSON.stringify(result.response, null, 2).split('\n').map(l => '   ' + l).join('\n'));
        } else if (result.error) {
            console.log('   Error:', result.error);
        }
    }

    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r.status === 'PASS').length;
    console.log(`\n📊 Results: ${passed}/${results.length} tests passed\n`);

    if (passed < results.length) {
        console.log('💡 Tips:');
        console.log('   1. Start Python ML Service: python ml_service/main.py');
        console.log('   2. Start Express Backend: cd backend && npm run dev');
        console.log('   3. Check ports 3000, 3001, 8000 are available\n');
    }
}

runTests();
