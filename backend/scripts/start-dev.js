#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Pharmalink Backend in Development Mode...\n');

// Check if all microservices have package.json files
const microservices = [
    'drug_interaction_microservice',
    'personalized_advisory_microservice',
    'crossbrand_comparator_microservice',
    'prescription_interpreter_microservice'
];

console.log('📦 Checking microservice dependencies...');

let allReady = true;
microservices.forEach(service => {
    const packagePath = path.join(__dirname, '..', 'microservices', service, 'package.json');
    if (!fs.existsSync(packagePath)) {
        console.log(`❌ ${service}: package.json not found`);
        allReady = false;
    } else {
        console.log(`✅ ${service}: Ready`);
    }
});

if (!allReady) {
    console.log('\n❌ Some microservices are not ready. Please run "npm run setup" first.');
    process.exit(1);
}

console.log('\n🎯 Starting services...\n');

// Start API Gateway
console.log('🌐 Starting API Gateway on port 3000...');
const gateway = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

// Start microservices with delay to avoid port conflicts
setTimeout(() => {
    console.log('🧬 Starting Drug Interaction Microservice on port 3001...');
    const drugService = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..', 'microservices', 'drug_interaction_microservice'),
        stdio: 'inherit',
        shell: true
    });
}, 2000);

setTimeout(() => {
    console.log('💡 Starting Personalized Advisory Microservice on port 3002...');
    const advisoryService = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..', 'microservices', 'personalized_advisory_microservice'),
        stdio: 'inherit',
        shell: true
    });
}, 4000);

setTimeout(() => {
    console.log('⚖️ Starting Cross-Brand Comparator Microservice on port 3003...');
    const comparatorService = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..', 'microservices', 'crossbrand_comparator_microservice'),
        stdio: 'inherit',
        shell: true
    });
}, 6000);

setTimeout(() => {
    console.log('📋 Starting Prescription Interpreter Microservice on port 3004...');
    const prescriptionService = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..', 'microservices', 'prescription_interpreter_microservice'),
        stdio: 'inherit',
        shell: true
    });
}, 8000);

setTimeout(() => {
    console.log('\n✨ All services started! Available endpoints:');
    console.log('🌐 API Gateway: http://localhost:3000');
    console.log('🧬 Drug Interactions: http://localhost:3000/api/drug-interactions');
    console.log('💡 Advisory: http://localhost:3000/api/advisory');
    console.log('⚖️ Comparator: http://localhost:3000/api/comparator');
    console.log('📋 Prescription: http://localhost:3000/api/prescription');
    console.log('\n🔍 Health checks:');
    console.log('   curl http://localhost:3000/health');
    console.log('   curl http://localhost:3001/health');
    console.log('   curl http://localhost:3002/health');
    console.log('   curl http://localhost:3003/health');
    console.log('   curl http://localhost:3004/health');
}, 10000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all services...');

    if (gateway) gateway.kill();

    // Kill all node processes on microservice ports
    const killPorts = [3001, 3002, 3003, 3004];
    killPorts.forEach(port => {
        try {
            // Windows-specific process killing
            spawn('netstat', ['-ano'], { stdio: 'pipe' })
                .on('close', (code) => {
                    // This is a simplified approach - in production, use proper process management
                });
        } catch (error) {
            // Ignore errors during shutdown
        }
    });

    setTimeout(() => {
        console.log('👋 Pharmalink Backend stopped.');
        process.exit(0);
    }, 2000);
});

// Keep the script running
process.stdin.resume();