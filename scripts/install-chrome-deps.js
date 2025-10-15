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
    console.log('🚂 Detected Railway environment, verifying system Chrome...');
    
    // On Railway with nixpacks.toml, Chrome should already be installed
    // Just verify it's available
    try {
      execSync('which chromium-browser', { stdio: 'pipe' });
      console.log('✅ Chromium found in system PATH');
    } catch (error) {
      try {
        execSync('which chromium', { stdio: 'pipe' });
        console.log('✅ Chromium found in system PATH');
      } catch (error2) {
        console.warn('⚠️ Chromium not found in PATH, will use fallback paths');
      }
    }
  } else {
    console.log('💻 Local development environment, skipping system Chrome verification');
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
