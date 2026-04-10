import { encryptJiraToken, decryptJiraToken } from './jira-crypto';

describe('JIRA Token Encryption', () => {
  const token = 'test-jira-token-123';
  const key = '12345678901234567890123456789012';
  beforeAll(() => {
    process.env.JIRA_CREDENTIALS_KEY = key; // 32 chars
  });

  it('should encrypt and decrypt the token correctly', () => {
    const encrypted = encryptJiraToken(token, key);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(token);
    const decrypted = decryptJiraToken(encrypted, key);
    expect(decrypted).toBe(token);
  });

  it('should produce different ciphertexts for the same token (random IV)', () => {
    const encrypted1 = encryptJiraToken(token, key);
    const encrypted2 = encryptJiraToken(token, key);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptJiraToken(encrypted1, key)).toBe(token);
    expect(decryptJiraToken(encrypted2, key)).toBe(token);
  });

  it('should throw if key is missing or wrong length', () => {
    const oldKey = process.env.JIRA_CREDENTIALS_KEY;
    process.env.JIRA_CREDENTIALS_KEY = 'shortkey';
    expect(() => encryptJiraToken(token, process.env.JIRA_CREDENTIALS_KEY as string)).toThrow();
    process.env.JIRA_CREDENTIALS_KEY = oldKey;
  });
});
