import fetch from 'node-fetch';
import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/dora/deployment-frequency';
const PROJECT_KEY = process.env.TEST_PROJECT_KEY || 'PN';
const DEV_LOGIN_URL = process.env.DEV_LOGIN_URL || 'http://localhost:3000/api/auth/dev-login';
let TOKEN = process.env.TEST_JWT;

async function getDevToken() {
  const res = await fetch(DEV_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'local-dev-user', email: 'local@example.com' })
  });
  if (!res.ok) {
    throw new Error('Dev login failed');
  }
  const data = await res.json();
  return data.token;
}

async function main() {
  if (!TOKEN) {
    console.log('ℹ️  Nessun TEST_JWT trovato, provo login di sviluppo...');
    TOKEN = await getDevToken();
    if (!TOKEN) {
      console.error('❌ Impossibile ottenere un token di sviluppo');
      process.exit(1);
    }
  }
  const url = `${API_URL}?projectKey=${PROJECT_KEY}&from=2026-01-01&to=2026-01-31`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  if (res.ok && Array.isArray(data.versions)) {
    console.log('✅ Test endpoint deployment-frequency: SUCCESS');
  } else {
    console.error('❌ Test endpoint deployment-frequency: ERROR');
  }
}

main();
