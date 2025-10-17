import { google } from 'googleapis';
import { storage } from './storage';
import { refreshAccessToken } from './google-oauth';

export async function getGoogleDocsClient(userId: string) {
  // Get user settings with Google tokens
  const settings = await storage.getUserSettings(userId);

  if (!settings?.googleAccessToken) {
    throw new Error('Google Docs not connected. Please connect your Google account in Settings.');
  }

  // Check if token is expired
  const now = new Date();
  const isExpired = settings.googleTokenExpiry && new Date(settings.googleTokenExpiry) <= now;

  let accessToken = settings.googleAccessToken;

  // Refresh token if expired
  if (isExpired && settings.googleRefreshToken) {
    try {
      const newTokens = await refreshAccessToken(settings.googleRefreshToken);
      
      // Update tokens in database
      await storage.upsertUserSettings(userId, {
        googleAccessToken: newTokens.access_token || settings.googleAccessToken,
        googleTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : settings.googleTokenExpiry,
      });

      accessToken = newTokens.access_token || settings.googleAccessToken;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      throw new Error('Google token expired and refresh failed. Please reconnect your Google account in Settings.');
    }
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.docs({ version: 'v1', auth: oauth2Client });
}

// Legacy function - kept for backward compatibility but will throw error
export async function getUncachableGoogleDocsClient() {
  throw new Error('This function is deprecated. Use getGoogleDocsClient(userId) instead.');
}
