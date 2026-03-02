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
    'prescription_interpreter_microservice',
    'treatment_identifier_microservice'
];

console.log('📦 Checking microservice dependencies...');

let allReady = true;
microservices.forEach(service => {
    const packagePath = path.join(__dirname, '..', 'microservices', service, 'package.json');
    const nodeModulesPath = path.join(__dirname, '..', 'microservices', service, 'node_modules');
    if (!fs.existsSync(packagePath)) {
        console.log(`❌ ${service}: package.json not found`);
        allReady = false;
    } else if (!fs.existsSync(nodeModulesPath)) {
        console.log(`⚠️  ${service}: node_modules not found - installing dependencies...`);
        // Install silently
        try {
            require('child_process').execSync('npm install', {
                cwd: path.join(__dirname, '..', 'microservices', service),
                stdio: 'pipe'
            });
            console.log(`✅ ${service}: Dependencies installed`);
        } catch (error) {
            console.log(`❌ ${service}: Failed to install dependencies`);
            allReady = false;
        }
    } else {
        console.log(`✅ ${service}: Ready`);
    }
});

if (!allReady) {
    console.log('\n❌ Some microservices are not ready. Please check the output above.');
    process.exit(1);
}

console.log('\n🎯 Starting services...\n');

const processes = [];
let servicesStarted = 0;

// Function to start a service
function startService(name, serviceDir, port, delay) {
    setTimeout(() => {
        console.log(`\n${name} - Starting on port ${port}...`);
        const service = spawn('node', ['index.js'], {
            cwd: path.join(__dirname, '..', 'microservices', serviceDir),
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'development' },
            shell: true
        });

        service.on('error', (error) => {
            console.error(`❌ ${name} failed to start:`, error.message);
        });

        service.on('exit', (code) => {
            if (code !== 0) {
                console.error(`⚠️  ${name} exited with code ${code}`);
            }
        });

        processes.push(service);
        servicesStarted++;
    }, delay);
}

// Start API Gateway first
console.log('🌐 Starting API Gateway on port 3000...');
const gateway = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
});

gateway.on('error', (error) => {
    console.error('❌ API Gateway failed to start:', error.message);
});

gateway.on('exit', (code) => {
    if (code !== 0) {
        console.error(`⚠️  API Gateway exited with code ${code}`);
    }
});

processes.push(gateway);

// Start microservices with staggered delays
startService('🧬 Drug Interaction', 'drug_interaction_microservice', 3001, 1500);
startService('💡 Personalized Advisory', 'personalized_advisory_microservice', 3002, 3000);
startService('⚖️ Cross-Brand Comparator', 'crossbrand_comparator_microservice', 3003, 4500);
startService('📋 Prescription Interpreter', 'prescription_interpreter_microservice', 3004, 6000);
startService('🔬 Treatment Identifier', 'treatment_identifier_microservice', 3005, 7500);

// Display startup information
setTimeout(() => {
    console.log('\n' + '='.repeat(70));
    console.log('✨ All services started! Available endpoints:');
    console.log('='.repeat(70));
    console.log('🌐 API Gateway: http://localhost:3000');
    console.log('🧬 Drug Interactions: http://localhost:3000/api/drug-interactions');
    console.log('💡 Advisory: http://localhost:3000/api/advisory');
    console.log('⚖️ Comparator: http://localhost:3000/api/comparator');
    console.log('📋 Prescription: http://localhost:3000/api/prescription');
    console.log('🔬 Treatment: http://localhost:3000/api/treatment');
    console.log('\n🔍 Health checks:');
    console.log('   GET http://localhost:3000/health');
    console.log('   GET http://localhost:3001/health');
    console.log('   GET http://localhost:3002/health');
    console.log('   GET http://localhost:3003/health');
    console.log('   GET http://localhost:3004/health');
    console.log('   GET http://localhost:3005/health');
    console.log('='.repeat(70));
}, 9000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down all services...');

    processes.forEach((proc, index) => {
        if (proc) {
            try {
                proc.kill('SIGTERM');
            } catch (e) {
                // Process already terminated
            }
        }
    });

    setTimeout(() => {
        console.log('👋 Pharmalink Backend stopped.');
        process.exit(0);
    }, 2000);
});

// Keep the script running
process.stdin.resume();