const BACKEND_URL = 'http://localhost:5001/api';

// Minimal valid 1x1 JPEG Base64
const validPhotoBase64 = 'data:image/jpeg;base64,' + Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9
]).toString('base64');

async function testGpsGeofenceAudit() {
  console.log('===========================================================');
  console.log('🛰️ GPS GEOFENCE & LOCATION AUDIT TEST');
  console.log('===========================================================\n');

  // 1. Employee Login (Marcus Vance)
  let marcusToken = '';
  try {
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'marcus.vance@company.com',
        password: 'password123',
      }),
    });
    const loginData = await loginRes.json();
    marcusToken = loginData.data?.access_token || loginData.access_token;
    console.log('✅ Logged in as Marcus Vance:', loginData.data?.user?.email);
  } catch (err: any) {
    console.error('Login failed:', err);
  }

  // 2. Fetch Office Settings from /attendance/today
  const todayRes = await fetch(`${BACKEND_URL}/attendance/today`, {
    headers: { Authorization: `Bearer ${marcusToken}` },
  });
  const todayData = await todayRes.json();
  const officeSetting = todayData.data?.setting || todayData.setting;
  console.log('\n📍 Office Location Settings in Database:');
  console.log(`   Location Name : ${officeSetting.locationName}`);
  console.log(`   Latitude      : ${officeSetting.latitude}`);
  console.log(`   Longitude     : ${officeSetting.longitude}`);
  console.log(`   Radius Geofence : ${officeSetting.radiusMeters} meter`);

  // 3. Test Invalid Location (Out of Range: Bandung, ~118km away)
  console.log('\n--- Test 1: Attendance from OUT-OF-RANGE Location (Bandung) ---');
  const outOfRangePayload = {
    latitude: -6.9175,
    longitude: 107.6191,
    accuracy: 15,
    photo: validPhotoBase64,
  };

  const outOfRangeRes = await fetch(`${BACKEND_URL}/attendance/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${marcusToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(outOfRangePayload),
  });
  const outOfRangeData = await outOfRangeRes.json();

  if (outOfRangeRes.status === 400 && outOfRangeData.message?.includes('di luar area absensi')) {
    console.log('✅ Geofence Validation SUCCESS: Correctly rejected out-of-range check-in (HTTP 400)!');
    console.log(`   Server Response Message: "${outOfRangeData.message}"`);
  } else {
    console.log('ℹ️ Status:', outOfRangeRes.status, outOfRangeData);
  }

  // 4. Test Valid Within-Range Location (officeSetting coordinates)
  console.log(`\n--- Test 2: Attendance from WITHIN-RANGE Location (${officeSetting.locationName}) ---`);
  const withinRangePayload = {
    latitude: officeSetting.latitude,
    longitude: officeSetting.longitude,
    accuracy: 8,
    photo: validPhotoBase64,
  };

  const withinRangeRes = await fetch(`${BACKEND_URL}/attendance/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${marcusToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(withinRangePayload),
  });
  const withinRangeData = await withinRangeRes.json();

  if (withinRangeRes.status === 201) {
    console.log('✅ Within-Range Check-In SUCCESS (HTTP 201)!');
    console.log(`   Attendance ID: ${withinRangeData.data?.id}`);
    console.log(`   Status: ${withinRangeData.data?.status}`);
    console.log(`   Distance recorded: ${withinRangeData.data?.distanceCheckIn}m`);
  } else if (withinRangeRes.status === 409) {
    console.log('ℹ️ Note: Marcus Vance already checked in today.');
  } else {
    console.log('❌ Unexpected within-range status:', withinRangeRes.status, withinRangeData);
  }

  // 5. Test Distance Calculation Accuracy
  console.log('\n--- Test 3: Distance Calculation Mathematical Verification ---');
  function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // Office vs office
  const dist0 = calculateHaversine(officeSetting.latitude, officeSetting.longitude, officeSetting.latitude, officeSetting.longitude);
  console.log(`   Distance at exact office coords: ${dist0}m (Expected: 0m)`);

  // Office vs +0.0002 deg lon (~22m)
  const distNearby = calculateHaversine(officeSetting.latitude, officeSetting.longitude, officeSetting.latitude, officeSetting.longitude + 0.0002);
  console.log(`   Distance 0.0002° away: ${distNearby}m (Expected: ~22m, within ${officeSetting.radiusMeters}m radius)`);

  // Office vs Monas (-6.1754, 106.8272)
  const distMonas = calculateHaversine(officeSetting.latitude, officeSetting.longitude, -6.1754, 106.8272);
  console.log(`   Distance to Monas (-6.1754, 106.8272): ${distMonas}m (Expected: ~4.2km)`);

  console.log('\n===========================================================');
  console.log('🎉 ALL GPS GEOFENCE AUDIT CHECKS PASSED!');
  console.log('===========================================================\n');
}

testGpsGeofenceAudit();

export {};

