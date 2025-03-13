#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

console.log('Running cleanup verification test...');

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check that src directory exists in the correct location
const srcPath = path.join(__dirname, '..', 'src');
if (!fs.existsSync(srcPath)) {
  console.error('ERROR: src directory not found in nextjs-web-app!');
  process.exit(1);
}

// Check that there's no nested nextjs-web-app directory
const nestedPath = path.join(__dirname, '..', 'nextjs-web-app');
if (fs.existsSync(nestedPath)) {
  console.error('ERROR: Nested nextjs-web-app directory still exists!');
  process.exit(1);
}

// Check that key files exist
const requiredFiles = [
  'src/app/results/[requestId]/page.tsx',
  'src/lib/auth/index.ts',
  'middleware.ts'
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Required file ${file} not found!`);
    process.exit(1);
  }
}

console.log('All checks passed! The application structure is correct.');

// Try to run Next.js build to verify there are no build errors
try {
  console.log('Testing Next.js build...');
  // Use --no-lint to skip linting for this quick test
  execSync('npm run build --no-lint', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('Build test successful!');
} catch (error) {
  console.error('Build test failed:', error.message);
  process.exit(1);
}

console.log('Cleanup verification completed successfully!'); 