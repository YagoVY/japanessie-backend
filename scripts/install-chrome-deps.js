#!/usr/bin/env node

/**
 * Post-install script for Railway deployment
 * Installs system Chrome dependencies and verifies Chrome installation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Installing Chrome dependencies for Railway...');

try {
  // Check if we're on Railway (has RAILWAY_ENVIRONMENT variable)
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
  
  if (isRailway) {
    console.log('🚂 Detected Railway environment, installing system Chrome...');
    
    // Install Chromium and dependencies
    const installCommands = [
      'apt-get update',
      'apt-get install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxss1 libnss3'
    ];
    
    for (const cmd of installCommands) {
      try {
        console.log(`Running: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
      } catch (error) {
        console.warn(`Warning: ${cmd} failed:`, error.message);
      }
    }
    
    // Verify Chrome installation
    try {
      execSync('which chromium-browser', { stdio: 'pipe' });
      console.log('✅ Chromium installed successfully');
    } catch (error) {
      console.warn('⚠️ Chromium not found, will use fallback paths');
    }
  } else {
    console.log('💻 Local development environment, skipping system Chrome installation');
  }
  
  // Create Chrome path configuration
  const chromePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
  ];
  
  let chromePath = null;
  for (const path of chromePaths) {
    if (fs.existsSync(path)) {
      chromePath = path;
      break;
    }
  }
  
  if (chromePath) {
    console.log(`✅ Chrome found at: ${chromePath}`);
    // Set environment variable for runtime
    process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
  } else {
    console.log('⚠️ No system Chrome found, Puppeteer will use bundled Chrome');
  }
  
  console.log('🎉 Chrome dependency installation complete');
  
} catch (error) {
  console.error('❌ Error installing Chrome dependencies:', error.message);
  // Don't fail the build, just warn
  console.log('⚠️ Continuing with build despite Chrome installation issues');
}
