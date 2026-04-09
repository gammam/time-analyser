import { encryptJiraToken, decryptJiraToken } from './jira-crypto';

describe('JIRA Token Encryption', () => {
  const token = 'test-jira-token-123';
  beforeAll(() => {
    process.env.JIRA_CREDENTIALS_KEY = '12345678901234567890123456789012'; // 32 chars
  });

  it('should encrypt and decrypt the token correctly', () => {
    const encrypted = encryptJiraToken(token);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(token);
    const decrypted = decryptJiraToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it('should produce different ciphertexts for the same token (random IV)', () => {
    const encrypted1 = encryptJiraToken(token);
    const encrypted2 = encryptJiraToken(token);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decryptJiraToken(encrypted1)).toBe(token);
    expect(decryptJiraToken(encrypted2)).toBe(token);
  });

  it('should throw if key is missing or wrong length', () => {
    const oldKey = process.env.JIRA_CREDENTIALS_KEY;
    process.env.JIRA_CREDENTIALS_KEY = 'shortkey';
    expect(() => encryptJiraToken(token)).toThrow();
    process.env.JIRA_CREDENTIALS_KEY = oldKey;
  });
});
