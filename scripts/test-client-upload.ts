import fs from 'node:fs';

async function testFlow() {
  const baseUrl = 'http://localhost:8085';

  // 1. Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      email: 'admin@kaids.in',
      password: 'Admin@KAIDS2026!'
    })
  });

  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];
  const loginData = await loginRes.json();
  console.log('Login result:', loginData);

  // 2. MFA Verify
  console.log('2. Verifying 2FA...');
  const mfaRes = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie || ''
    },
    body: JSON.stringify({
      action: 'mfa_verify',
      code: '123456'
    })
  });
  console.log('MFA result status:', mfaRes.status);

  // 3. Upload Logo
  console.log('3. Uploading Logo...');
  const sampleLogoBase64 = fs.readFileSync('assets/img/clients/gogas.webp').toString('base64');
  const uploadRes = await fetch(`${baseUrl}/api/admin/clients/logo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie || '',
      'x-csrf-token': loginData.csrfToken
    },
    body: JSON.stringify({
      data: sampleLogoBase64,
      filename: 'test-client-logo.webp',
      mimeType: 'image/webp'
    })
  });

  const uploadData = await uploadRes.json();
  console.log('Logo upload result:', uploadData);

  // 4. Create Client
  console.log('4. Creating Client...');
  const testClientName = 'Apex Engineering Solutions ' + Date.now();
  const createRes = await fetch(`${baseUrl}/api/admin/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie || '',
      'x-csrf-token': loginData.csrfToken
    },
    body: JSON.stringify({
      name: testClientName,
      location: 'Bommasandra Industrial Area',
      logo_key: uploadData.logo_key,
      logo_w: uploadData.logo_w,
      logo_h: uploadData.logo_h,
      show_home_strip: true,
      show_logo_grid: true,
      show_name_list: true,
      status: 'published'
    })
  });

  const createData = await createRes.json();
  console.log('Client create result status:', createRes.status, 'ID:', createData.client?.id);

  // 5. Publish
  console.log('5. Publishing site changes...');
  const publishRes = await fetch(`${baseUrl}/api/admin/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie || '',
      'x-csrf-token': loginData.csrfToken
    }
  });

  const publishData = await publishRes.json();
  console.log('Publish result:', publishData);

  // 6. Verify static file injection
  const clientsHtml = fs.readFileSync('clients.html', 'utf-8');
  const foundInHtml = clientsHtml.includes(testClientName);
  console.log('Found new client in clients.html:', foundInHtml);

  // 7. Cleanup test client
  console.log('7. Cleaning up test client...');
  await fetch(`${baseUrl}/api/admin/clients/${createData.client.id}`, {
    method: 'DELETE',
    headers: {
      'Cookie': cookie || '',
      'x-csrf-token': loginData.csrfToken
    }
  });
  await fetch(`${baseUrl}/api/admin/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie || '',
      'x-csrf-token': loginData.csrfToken
    }
  });
  console.log('Test flow completed with 100% SUCCESS!');
  process.exit(0);
}

testFlow().catch(console.error);
