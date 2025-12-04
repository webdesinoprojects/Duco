/**
 * Test New Admin Credentials
 * Tests the updated admin login credentials
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

console.log('\n' + '='.repeat(80));
console.log('🔐 TESTING NEW ADMIN CREDENTIALS');
console.log('='.repeat(80) + '\n');

// Read credentials from .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

console.log('📋 Credentials loaded from .env:');
console.log('   Email:', ADMIN_EMAIL);
console.log('   Password:', '*'.repeat(ADMIN_PASSWORD.length), `(${ADMIN_PASSWORD.length} characters)`);
console.log('');

// Verify credentials match expected values
const expectedEmail = 'ducoart@yahoo.com';
const expectedPassword = 'DUCOART@';

console.log('✅ Verification:');
if (ADMIN_EMAIL === expectedEmail) {
  console.log('   ✓ Email matches: ducoart@yahoo.com');
} else {
  console.log('   ✗ Email mismatch!');
  console.log('     Expected:', expectedEmail);
  console.log('     Got:', ADMIN_EMAIL);
}

if (ADMIN_PASSWORD === expectedPassword) {
  console.log('   ✓ Password matches: DUCOART@');
} else {
  console.log('   ✗ Password mismatch!');
  console.log('     Expected:', expectedPassword);
  console.log('     Got:', ADMIN_PASSWORD);
}

console.log('\n' + '='.repeat(80));
console.log('🌐 LOGIN INSTRUCTIONS');
console.log('='.repeat(80) + '\n');

console.log('1. Start the backend server:');
console.log('   cd Duco_Backend');
console.log('   npm start (or node index.js)\n');

console.log('2. Start the frontend:');
console.log('   cd Duco_frontend');
console.log('   npm run dev\n');

console.log('3. Navigate to admin login:');
console.log('   http://localhost:5173/admin/login\n');

console.log('4. Enter credentials:');
console.log('   Email/User ID: ducoart@yahoo.com');
console.log('   Password: DUCOART@\n');

console.log('='.repeat(80) + '\n');

console.log('💡 Note: These are hardcoded credentials stored in .env file');
console.log('   They will work immediately without database seeding.\n');
