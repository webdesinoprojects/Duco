// Script to fix dependency issues
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing backend dependencies...');

// Remove node_modules and package-lock.json if they exist
const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageLockPath = path.join(__dirname, 'package-lock.json');

try {
  if (fs.existsSync(nodeModulesPath)) {
    console.log('📁 Removing node_modules...');
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  }
  
  if (fs.existsSync(packageLockPath)) {
    console.log('📄 Removing package-lock.json...');
    fs.unlinkSync(packageLockPath);
  }
  
  console.log('✅ Cleanup complete! Now run: npm install');
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
}