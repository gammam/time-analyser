import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM
const KEY_LENGTH = 32; // 256 bits

// The encryption key should be stored securely (env variable, secret manager, etc.)


function validateKey(key: string) {
  if (!key || key.length !== KEY_LENGTH) {
    throw new Error('JIRA_CREDENTIALS_KEY must be set to 32 chars (256 bits)');
  }
}

export function encryptJiraToken(token: string, key: string): string {
  validateKey(key);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted].join('.')
}

export function decryptJiraToken(encrypted: string, key: string): string {
  validateKey(key);
  const [ivB64, authTagB64, encryptedData] = encrypted.split('.')
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
