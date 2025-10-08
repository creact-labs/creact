#!/usr/bin/env node

/**
 * Simple test script for the basic setup example
 * Runs the example and checks for expected output
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing CReact Basic Setup Example...\n');

// Run the example
const child = spawn('node', ['-r', 'tsx/cjs', 'index.tsx'], {
  cwd: __dirname,
  stdio: 'pipe'
});

let output = '';
let errorOutput = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

child.on('close', (code) => {
  console.log(`\n📊 Test Results:`);
  console.log(`   Exit code: ${code}`);
  console.log(`   Output length: ${output.length} chars`);
  console.log(`   Error length: ${errorOutput.length} chars`);
  
  // Check for expected output patterns
  const expectedPatterns = [
    '🚀 Starting CReact Basic Setup Example',
    'CReact providers configured',
    'Rendering CloudDOM',
    'Materializing CloudDOM',
    'Deploying: my-app-assets',
    'Deploying: my-app-db',
    'Deploying: my-app-server',
    '✅ Database deployed',
    'Deployment completed successfully'
  ];
  
  let passedChecks = 0;
  console.log(`\n🔍 Pattern Checks:`);
  
  expectedPatterns.forEach((pattern, index) => {
    const found = output.includes(pattern);
    console.log(`   ${found ? '✅' : '❌'} ${index + 1}. "${pattern}"`);
    if (found) passedChecks++;
  });
  
  console.log(`\n📈 Summary: ${passedChecks}/${expectedPatterns.length} checks passed`);
  
  if (code === 0 && passedChecks === expectedPatterns.length) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
});