import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getGoogleCalendarClient } from "./google-calendar";
import { getGoogleDocsClient } from "./google-docs";
import { calculateMeetingScore, extractAgendaFromDescription, extractKeywordsFromNotes } from "./scoring";
import { insertMeetingSchema, insertMeetingScoreSchema, updateUserSettingsSchema } from "@shared/schema";
import { generateWeeklyChallenge, updateChallengeProgress } from "./gamification";
import { setupAuth, isAuthenticated, isLocalAuthBypassed, getLocalDevUser } from "./replitAuth";
import { getAuthUrl, getTokensFromCode } from "./google-oauth";
import jwt from 'jsonwebtoken';
import { encryptJiraToken, decryptJiraToken } from "./jira-crypto";
import { stringify } from "querystring";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  // Reference: blueprint:javascript_log_in_with_replit
  await setupAuth(app);

  // Privacy Policy and Terms of Service (public routes)
  app.get('/privacy-policy', async (req, res) => {
    const fs = await import('fs/promises');
    const markdown = await fs.readFile('privacy-policy.md', 'utf-8');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - ProdBuddy</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
          h1 { border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
          h2 { margin-top: 30px; color: #0066cc; }
          a { color: #0066cc; }
        </style>
      </head>
      <body>${markdown.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/- (.+)$/gm, '<li>$1</li>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>').replace(/\n\n/g, '</p><p>').replace(/^(?!<[h|l])/gm, '<p>').replace(/<p><\/p>/g, '')}</body>
      </html>
    `);
  });

  app.get('/terms-of-service', async (req, res) => {
    const fs = await import('fs/promises');
    const markdown = await fs.readFile('terms-of-service.md', 'utf-8');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - ProdBuddy</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
          h1 { border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
          h2 { margin-top: 30px; color: #0066cc; }
          a { color: #0066cc; }
        </style>
      </head>
      <body>${markdown.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/- (.+)$/gm, '<li>$1</li>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>').replace(/\n\n/g, '</p><p>').replace(/^(?!<[h|l])/gm, '<p>').replace(/<p><\/p>/g, '')}</body>
      </html>
    `);
  });

  // Get authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Complete onboarding
  app.post('/api/auth/complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user to mark onboarding as complete
      const updatedUser = await storage.upsertUser({
        ...user,
        hasCompletedOnboarding: 1,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Google OAuth - Initiate authentication
  app.get('/auth/google', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔵 Google OAuth initiation requested');
      const userId = req.user.claims.sub;
      console.log('🔵 User ID:', userId);
      
      // Generate random CSRF token and store it in session
      const crypto = await import('crypto');
      const csrfToken = crypto.randomBytes(32).toString('hex');
      console.log('🔵 Generated CSRF token');
      
      // Capture the origin URL to redirect back after OAuth
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const returnUrl = `${protocol}://${host}/settings`;
      
      // Store CSRF token, userId, and return URL in session for validation
      if (!req.session.oauthState) {
        req.session.oauthState = {};
      }
      req.session.oauthState[csrfToken] = {
        userId,
        timestamp: Date.now(),
        returnUrl,
      };
      
      const authUrl = getAuthUrl(csrfToken); // Pass CSRF token as state
      console.log('🔵 Redirecting to Google OAuth URL:', authUrl);
      console.log('🔵 Will return to:', returnUrl);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('🔴 Error initiating Google OAuth:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate Google OAuth' });
    }
  });

  // Google OAuth - Callback handler (protected with authentication)
  app.get('/auth/google/callback', isAuthenticated, async (req: any, res) => {
    try {
      const { code, state: csrfToken } = req.query;

      if (!code || !csrfToken) {
        throw new Error('Missing authorization code or state token');
      }

      // Validate CSRF token and get userId from session
      const oauthState = req.session.oauthState?.[csrfToken as string];
      const authenticatedUserId = req.user.claims.sub;

      if (!oauthState) {
        throw new Error('Invalid or expired OAuth state token');
      }

      // Verify that session userId matches authenticated user
      if (oauthState.userId !== authenticatedUserId) {
        throw new Error('User ID mismatch - potential CSRF attack');
      }

      // Check token is not too old (5 minutes max)
      const tokenAge = Date.now() - oauthState.timestamp;
      if (tokenAge > 5 * 60 * 1000) {
        throw new Error('OAuth state token expired');
      }

      // Clean up used token
      delete req.session.oauthState[csrfToken as string];

      // Exchange code for tokens
      const tokens = await getTokensFromCode(code as string);

      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Save tokens to database for authenticated user only
      await storage.upsertUserSettings(authenticatedUserId, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });

      // Get the return URL from session state
      const returnUrl = oauthState.returnUrl || '/settings';
      console.log('🔵 OAuth success, redirecting to:', returnUrl);
      
      // Redirect back to the original domain's settings page with success message
      res.redirect(`${returnUrl}?google_connected=true`);
    } catch (error: any) {
      console.error('🔴 Error in Google OAuth callback:', error);
      
      // Try to get returnUrl from session, fallback to relative path
      const returnUrl = req.session.oauthState?.[req.query.state as string]?.returnUrl || '/settings';
      res.redirect(`${returnUrl}?google_error=${encodeURIComponent(error.message || 'OAuth failed')}`);
    }
  });

  // Disconnect Google account
  app.post('/api/auth/google/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Clear Google tokens from database
      await storage.upsertUserSettings(userId, {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      });

      res.json({ success: true, message: 'Google account disconnected' });
    } catch (error: any) {
      console.error('Error disconnecting Google account:', error);
      res.status(500).json({ error: error.message || 'Failed to disconnect Google account' });
    }
  });

  // Sync meetings from Google Calendar
  app.post("/api/meetings/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { timeMin, timeMax } = req.body;

      const calendar = await getGoogleCalendarClient(userId);
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      const meetings = [];

      for (const event of events) {
        if (!event.id || !event.summary || !event.start?.dateTime || !event.end?.dateTime) {
          continue;
        }

        const attendees = event.attendees || [];
        
        // Validate meeting data before upserting
        const meetingData = insertMeetingSchema.parse({
          id: event.id,
          userId,
          googleEventId: event.id,
          title: event.summary,
          description: event.description,
          startTime: new Date(event.start.dateTime),
          endTime: new Date(event.end.dateTime),
          participants: attendees.length,
          googleDocId: extractGoogleDocId(event.description),
        });
        
        const meeting = await storage.upsertMeeting(meetingData);

        // Calculate initial score
        const agenda = extractAgendaFromDescription(event.description || null);
        const duration = (new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / (1000 * 60);
        
        const score = calculateMeetingScore({
          title: event.summary,
          hasAgenda: agenda.hasAgenda,
          agendaLength: agenda.length,
          agendaTopicsCount: agenda.topicsCount,
          participants: attendees.length,
          durationMinutes: duration,
          actionItemsCount: 0,
          attentionPointsCount: 0,
          hasAccountability: false,
          hasDeadlines: false,
        });

        // Upsert score to prevent duplicates
        await storage.upsertMeetingScore({
          meetingId: meeting.id,
          ...score,
        });

        // Update challenge progress
        await updateChallengeProgress(userId, meeting.id);

        meetings.push(meeting);
      }

      res.json({ success: true, meetings, count: meetings.length });
    } catch (error: any) {
      console.error('Error syncing meetings:', error);
      res.status(500).json({ error: error.message || 'Failed to sync meetings' });
    }
  });

  // Get meetings for a date range
  app.get("/api/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;

      const meetings = await storage.getMeetingsByUserId(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const meetingsWithScores = await Promise.all(
        meetings.map(async (meeting) => {
          const score = await storage.getMeetingScore(meeting.id);
          return { ...meeting, score };
        })
      );

      res.json(meetingsWithScores);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
    }
  });

  // Link a Google Doc to a meeting and analyze it
  app.post("/api/meetings/:id/analyze-doc", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate input
      if (!req.body.googleDocId || typeof req.body.googleDocId !== 'string') {
        return res.status(400).json({ error: 'Valid googleDocId is required' });
      }
      
      const { googleDocId } = req.body;

      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      // Update meeting with doc ID
      await storage.updateMeeting(id, { googleDocId });

      // Fetch and analyze the doc
      const docs = await getGoogleDocsClient(meeting.userId);
      const doc = await docs.documents.get({ documentId: googleDocId });

      const content = extractTextFromDoc(doc.data);
      const { actionItems, attentionPoints, hasAccountability, hasDeadlines } = extractKeywordsFromNotes(content);

      // Recalculate score with notes data
      const agenda = extractAgendaFromDescription(meeting.description);
      const duration = (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60);

      const score = calculateMeetingScore({
        title: meeting.title,
        hasAgenda: agenda.hasAgenda,
        agendaLength: agenda.length,
        agendaTopicsCount: agenda.topicsCount,
        participants: meeting.participants,
        durationMinutes: duration,
        actionItemsCount: actionItems,
        attentionPointsCount: attentionPoints,
        hasAccountability,
        hasDeadlines,
      });

      // Upsert to prevent duplicate scores
      await storage.upsertMeetingScore({ meetingId: id, ...score });

      // Update challenge progress
      await updateChallengeProgress(meeting.userId, id);

      res.json({ success: true, score, content: content.substring(0, 500) });
    } catch (error: any) {
      console.error('Error analyzing doc:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze document' });
    }
  });

  // Get score statistics
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;

      const meetings = await storage.getMeetingsByUserId(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      const scores = await Promise.all(
        meetings.map(meeting => storage.getMeetingScore(meeting.id))
      );

      const validScores = scores.filter(s => s !== undefined);
      const avgScore = validScores.length > 0
        ? Math.round(validScores.reduce((sum, s) => sum + (s?.totalScore || 0), 0) / validScores.length)
        : 0;

      const trendData = groupMeetingsByDate(meetings, validScores);

      res.json({
        totalMeetings: meetings.length,
        averageScore: avgScore,
        trendData,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
    }
  });

  // Get current weekly challenge
  app.get("/api/challenge/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let challenge = await storage.getCurrentWeeklyChallenge(userId);
      
      if (!challenge) {
        challenge = await generateWeeklyChallenge(userId);
      }
      
      res.json(challenge);
    } catch (error: any) {
      console.error('Error fetching challenge:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch challenge' });
    }
  });

  // Generate new weekly challenge
  app.post("/api/challenge/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challenge = await generateWeeklyChallenge(userId);
      res.json(challenge);
    } catch (error: any) {
      console.error('Error generating challenge:', error);
      res.status(500).json({ error: error.message || 'Failed to generate challenge' });
    }
  });

  // Get user achievements
  app.get("/api/achievements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch achievements' });
    }
  });

  // ========== JIRA INTEGRATION ROUTES ==========
  
  // Sync JIRA tasks
  app.post("/api/jira/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user settings to retrieve JIRA credentials
      const userSettings = await storage.getUserSettings(userId);
      
      // Use user credentials if available, otherwise fall back to env variables
      const email = userSettings?.jiraEmail || process.env.JIRA_EMAIL;
      const apiToken = userSettings?.jiraApiToken || process.env.JIRA_API_TOKEN;
      const host = userSettings?.jiraHost || process.env.JIRA_HOST || 'https://pagopa.atlassian.net';
      const jqlQuery = userSettings?.jiraJqlQuery || process.env.JIRA_JQL_QUERY || 'status in ("To Do", "In Progress")';
      
      if (!email || !apiToken) {
        throw new Error('JIRA credentials not configured. Please configure your JIRA settings.');
      }

      // Use direct REST API call with new v3 endpoint
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      // Use the new /rest/api/3/search/jql endpoint
      const url = `${host}/rest/api/3/search/jql`;
      
      console.log('Calling JIRA API:', url);
      console.log('Using JQL query:', jqlQuery);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jql: jqlQuery,
          maxResults: 50,
          fields: ['summary', 'status', 'priority', 'assignee', 'project', 'timeestimate']
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('JIRA API Error:', response.status, errorText);
        throw new Error(`JIRA API returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Log the complete response to debug
      console.log('JIRA API Response:', JSON.stringify(data, null, 2));
      
      const issues = data.values || data.issues || [];
      
      console.log(`Found ${issues.length} JIRA issues`);
      if (issues.length > 0) {
        console.log('First issue sample:', JSON.stringify(issues[0], null, 2));
      }
      
      const syncedTasks = [];
      
      for (const issue of issues) {
        const fields = issue.fields || {};
        
        const taskData = {
          userId,
          jiraKey: issue.key || '',
          jiraId: issue.id || '',
          summary: fields.summary || '',
          description: '', 
          status: fields.status?.name || 'To Do',
          priority: fields.priority?.name || 'Medium',
          estimateHours: fields.timeestimate ? fields.timeestimate / 3600 : null,
          storyPoints: null,
          dueDate: null,
          assignee: fields.assignee?.displayName || 'Unassigned',
          projectKey: fields.project?.key || '',
          labels: []
        };
        
        const task = await storage.upsertJiraTask(taskData);
        syncedTasks.push(task);
      }
      
      res.json({
        success: true,
        count: syncedTasks.length,
        tasks: syncedTasks
      });
    } catch (error: any) {
      console.error('Error syncing JIRA tasks:', error);
      res.status(500).json({ error: error.message || 'Failed to sync JIRA tasks' });
    }
  });
  
  // Get JIRA tasks
  app.get("/api/jira/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.query;
      
      const tasks = await storage.getJiraTasksByUserId(userId, status as string | undefined);
      res.json(tasks);
    } catch (error: any) {
      console.error('Error fetching JIRA tasks:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch JIRA tasks' });
    }
  });
  
  // Calculate daily capacity
  app.post("/api/capacity/calculate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      
      const { calculateDailyCapacity } = await import('./capacity-calculator');
      
      // Get meetings for the day
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const meetings = await storage.getMeetingsByUserId(userId, dayStart, dayEnd);
      
      // Get tasks (not done)
      const allTasks = await storage.getJiraTasksByUserId(userId);
      const activeTasks = allTasks.filter(t => t.status !== 'Done' && t.status !== 'Closed');
      
      // Calculate capacity
      const capacity = calculateDailyCapacity(targetDate, meetings, activeTasks);
      
      // Save to database
      const savedCapacity = await storage.upsertDailyCapacity({
        userId,
        date: targetDate,
        ...capacity
      });
      
      res.json(savedCapacity);
    } catch (error: any) {
      console.error('Error calculating capacity:', error);
      res.status(500).json({ error: error.message || 'Failed to calculate capacity' });
    }
  });
  
  // Get weekly capacity
  app.get("/api/capacity/week", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart } = req.query;
      
      const weekStartDate = weekStart ? new Date(weekStart as string) : getWeekStart(new Date());
      const capacities = await storage.getDailyCapacitiesForWeek(userId, weekStartDate);
      
      res.json(capacities);
    } catch (error: any) {
      console.error('Error fetching weekly capacity:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch weekly capacity' });
    }
  });
  
  // Predict task completion for the week
  app.post("/api/tasks/predict", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart } = req.body;
      
      const { predictWeeklyCompletion } = await import('./capacity-calculator');
      
      const weekStartDate = weekStart ? new Date(weekStart) : getWeekStart(new Date());
      
      // Get tasks (not done)
      const allTasks = await storage.getJiraTasksByUserId(userId);
      const activeTasks = allTasks.filter(t => t.status !== 'Done' && t.status !== 'Closed');
      
      // Get or calculate daily capacities for the week
      let capacities = await storage.getDailyCapacitiesForWeek(userId, weekStartDate);
      
      if (capacities.length === 0) {
        // Calculate capacities if not yet calculated
        const { calculateDailyCapacity } = await import('./capacity-calculator');
        capacities = [];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStartDate);
          date.setDate(date.getDate() + i);
          
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          const meetings = await storage.getMeetingsByUserId(userId, dayStart, dayEnd);
          const capacity = calculateDailyCapacity(date, meetings, activeTasks);
          
          const savedCapacity = await storage.upsertDailyCapacity({
            userId,
            date,
            ...capacity
          });
          capacities.push(savedCapacity);
        }
      }
      
      // Predict completions
      const { predictions, summary } = predictWeeklyCompletion(weekStartDate, activeTasks, capacities);
      
      // Save predictions
      await storage.deleteTaskPredictionsByWeek(userId, weekStartDate);
      for (const pred of predictions) {
        await storage.upsertTaskPrediction({
          ...pred,
          userId
        });
      }
      
      res.json({
        weekStart: weekStartDate,
        summary,
        predictions: predictions.map((p, i) => ({
          ...p,
          task: activeTasks[i]
        }))
      });
    } catch (error: any) {
      console.error('Error predicting task completion:', error);
      res.status(500).json({ error: error.message || 'Failed to predict task completion' });
    }
  });
  
  // Get task predictions
  app.get("/api/tasks/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart } = req.query;
      
      const weekStartDate = weekStart ? new Date(weekStart as string) : getWeekStart(new Date());
      const predictions = await storage.getTaskPredictions(userId, weekStartDate);
      
      res.json(predictions);
    } catch (error: any) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch predictions' });
    }
  });

  // Get user settings (excluding sensitive jiraApiToken)
  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const settings = await storage.getUserSettings(userId);
      
      // Return safe response without exposing sensitive tokens (jiraApiToken, googleAccessToken, googleRefreshToken)
      res.json({
        id: settings?.id || '',
        userId: settings?.userId || userId,
        dailyWorkHours: settings?.dailyWorkHours || 8,
        contextSwitchingMinutes: settings?.contextSwitchingMinutes || 20,
        jiraEmail: settings?.jiraEmail || null,
        jiraHost: settings?.jiraHost || null,
        jiraJqlQuery: settings?.jiraJqlQuery || null,
        hasJiraCredentials: !!(settings?.jiraApiToken),
        hasGoogleCredentials: !!(settings?.googleAccessToken),
        updatedAt: settings?.updatedAt || null,
      });
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch settings' });
    }
  });

  // Update user settings
  app.post("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const validated = updateUserSettingsSchema.parse(req.body);
      
      const settings = await storage.upsertUserSettings(userId, validated);
      
      // Return safe response without exposing sensitive tokens (jiraApiToken, googleAccessToken, googleRefreshToken)
      res.json({
        id: settings.id,
        userId: settings.userId,
        dailyWorkHours: settings.dailyWorkHours,
        contextSwitchingMinutes: settings.contextSwitchingMinutes,
        jiraEmail: settings.jiraEmail || null,
        jiraHost: settings.jiraHost || null,
        jiraJqlQuery: settings.jiraJqlQuery || null,
        hasJiraCredentials: !!(settings.jiraApiToken),
        hasGoogleCredentials: !!(settings.googleAccessToken),
        updatedAt: settings.updatedAt,
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid settings data', details: error.errors });
      } else {
        res.status(500).json({ error: error.message || 'Failed to update settings' });
      }
    }
  });

  // Dev-only: login che genera un JWT valido per l'utente di test locale
  if (process.env.NODE_ENV === 'development' || process.env.DEV_LOGIN === '1') {
    app.post('/api/auth/dev-login', async (req: any, res: any) => {
      const userId = req.body?.userId || 'local-dev-user';
      const email = req.body?.email || 'local@example.com';
      const secret = process.env.SESSION_SECRET || 'dev-secret';
      const expiresIn = req.body?.expiresIn || '7d';
      const payload = {
        sub: userId,
        email,
        name: 'Local Dev',
        iat: Math.floor(Date.now() / 1000),
      };
      const token = jwt.sign(payload, secret, { expiresIn });
      res.json({ token, user: payload });
    });
  }

  // DORA: Deployment Frequency
  app.get('/api/dora/deployment-frequency', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const projectKey = typeof req.query.projectKey === 'string' ? req.query.projectKey : undefined;
      const team = typeof req.query.team === 'string' ? req.query.team : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      if (!projectKey) {
        return res.status(400).json({ error: 'Missing or invalid projectKey' });
      }
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        fromDate = d;
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        toDate = d;
      }
      const { fetchProjectVersionsRaw } = await import('./jira-client');
      const versions = await fetchProjectVersionsRaw(userId, projectKey);
      const versionList = Array.isArray(versions)
        ? versions
        : (Array.isArray((versions as any)?.values) ? (versions as any).values : []);
      const filtered = versionList.filter((v: any) => {
        if (!v.released || !v.releaseDate) return false;
        const relDate = new Date(v.releaseDate);
        if (isNaN(relDate.getTime())) return false;
        if (fromDate && relDate < fromDate) return false;
        if (toDate && relDate > toDate) return false;
        return true;
      });
      res.json({
        team: team || null,
        projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        deploymentFrequency: filtered.length,
      });
    } catch (err: any) {
      if (err && err.type && err.message) {
        res.status(err.type === 'auth' ? 401 : err.type === 'not_found' ? 404 : 500).json({
          error: err.message, type: err.type, details: err.details
        });
      } else {
        res.status(500).json({ error: err?.message || 'Failed to fetch deployment frequency' });
      }
    }
  });

  // DORA: Lead Time for Changes (Epic)
  app.get('/api/dora/lead-time-epic', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const projectKey = typeof req.query.projectKey === 'string' ? req.query.projectKey : undefined;
      const team = typeof req.query.team === 'string' ? req.query.team : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      if (!projectKey) {
        return res.status(400).json({ error: 'Missing or invalid projectKey' });
      }
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        fromDate = d;
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        toDate = d;
      }
      const { fetchEpicsWithChangelog } = await import('./jira-client');
      let epics: any[] = [];
      try {
        const result = await fetchEpicsWithChangelog(userId, projectKey, team, from, to);
        epics = Array.isArray(result) ? result : [];
      } catch (err: any) {
        if (err && err.type && err.message) {
          return res.status(err.type === 'auth' ? 401 : err.type === 'not_found' ? 404 : 500).json({
            error: err.message, type: err.type, details: err.details
          });
        }
        return res.status(500).json({ error: err?.message || 'Unknown error' });
      }
      let sumLeadTime = 0, countLeadTime = 0;
      let sumLeadTimeReadyForUAT = 0, countLeadTimeReadyForUAT = 0;
      const outputEpics: any[] = [];
      const skippedEpics: any[] = [];
      for (const e of epics) {
        const created = e.fields.created ? new Date(e.fields.created) : null;
        const releaseDate = e.fields.fixVersions?.[0]?.releaseDate ? new Date(e.fields.fixVersions[0].releaseDate) : null;
        let readyForUATDate: Date | null = null;
        if (e.changelog && Array.isArray(e.changelog.histories)) {
          for (const h of e.changelog.histories) {
            for (const item of h.items) {
              if (item.field === 'status' && item.toString === 'READY_FOR_UAT') {
                readyForUATDate = new Date(h.created);
                break;
              }
            }
            if (readyForUATDate) break;
          }
        }
        let leadTimeDays: number | null = null;
        if (created && releaseDate && !isNaN(created.getTime()) && !isNaN(releaseDate.getTime())) {
          leadTimeDays = Math.round((releaseDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          sumLeadTime += leadTimeDays;
          countLeadTime++;
        }
        let leadTimeReadyForUAT: number | null = null;
        if (created && readyForUATDate && !isNaN(created.getTime()) && !isNaN(readyForUATDate.getTime())) {
          leadTimeReadyForUAT = Math.round((readyForUATDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          sumLeadTimeReadyForUAT += leadTimeReadyForUAT;
          countLeadTimeReadyForUAT++;
        }
        if (!leadTimeDays && !leadTimeReadyForUAT) {
          skippedEpics.push({
            key: e.key, summary: e.fields.summary, created: created?.toISOString().slice(0, 10) || null,
            fixVersions: e.fields.fixVersions || [],
            releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
            readyForUATDate: readyForUATDate ? readyForUATDate.toISOString().slice(0, 10) : null,
            reason: 'Mancano releaseDate e transizione READY_FOR_UAT',
          });
        } else {
          outputEpics.push({
            key: e.key, summary: e.fields.summary, created: created?.toISOString().slice(0, 10) || null,
            fixVersions: e.fields.fixVersions || [],
            releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
            readyForUATDate: readyForUATDate ? readyForUATDate.toISOString().slice(0, 10) : null,
            leadTimeDays, leadTimeReadyForUAT,
          });
        }
      }
      res.json({
        team: team || null, projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        meanLeadTimeDays: countLeadTime > 0 ? +(sumLeadTime / countLeadTime).toFixed(2) : null,
        meanLeadTimeReadyForUAT: countLeadTimeReadyForUAT > 0 ? +(sumLeadTimeReadyForUAT / countLeadTimeReadyForUAT).toFixed(2) : null,
        epics: outputEpics, skippedEpics,
      });
    } catch (error: any) {
      console.error('Error in /api/dora/lead-time-epic:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch lead time for epics' });
    }
  });

  // DORA: Change Failure Rate (Dual-metric: DORA + SEND)
  app.get('/api/dora/change-failure-rate', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const projectKey = typeof req.query.projectKey === 'string' ? req.query.projectKey : undefined;
      const team = typeof req.query.team === 'string' ? req.query.team : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      // AC #2: Validate projectKey as required
      if (!projectKey) {
        return res.status(400).json({ error: 'Missing or invalid projectKey' });
      }

      // AC #2: Validate date formats
      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        fromDate = d;
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        toDate = d;
      }

      // Placeholder: Will implement Jira data retrieval in Task 2
      // For now, return zero-deploy structure for AC #8 validation
      const releases: any[] = [];
      const unmappedFailures: any[] = [];

      // AC #8: When totalDeployments = 0, changeFailureRate = null
      const doraMetrics = {
        totalDeployments: 0,
        failedDeployments: 0,
        changeFailureRate: null,
      };

      const sendMetrics = {
        totalDeployments: 0,
        failedDeployments: 0,
        changeFailureRate: null,
      };

      // AC #9: Return nested dora and send sub-objects
      res.json({
        team: team || null,
        projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        dora: doraMetrics,
        send: sendMetrics,
        releases,
        unmappedFailures,
      });
    } catch (err: any) {
      // AC #10: Structured error handling consistent with other DORA endpoints
      if (err && err.type && err.message) {
        res.status(err.type === 'auth' ? 401 : err.type === 'not_found' ? 404 : 500).json({
          error: err.message, type: err.type, details: err.details
        });
      } else {
        res.status(500).json({ error: err?.message || 'Failed to fetch change failure rate' });
      }
    }
  });

  // JIRA credentials - Save (POST)
  app.post('/api/jira/credentials', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const { jiraEmail, jiraApiToken, jiraHost, jiraEncryptionKey } = req.body;
      if (!jiraEmail || !jiraApiToken || !jiraHost || !jiraEncryptionKey) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const encryptedToken = encryptJiraToken(jiraApiToken, jiraEncryptionKey);
      await storage.upsertUserSettings(userId, { jiraEmail, jiraApiToken: encryptedToken, jiraHost });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving JIRA credentials:', error);
      res.status(500).json({ error: error.message || 'Failed to save JIRA credentials' });
    }
  });

  // JIRA credentials - Get (GET, no token exposed)
  app.get('/api/jira/credentials', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: 'No JIRA credentials found' });
      }
      res.json({
        jiraEmail: settings.jiraEmail,
        jiraHost: settings.jiraHost,
        hasToken: !!settings.jiraApiToken,
      });
    } catch (error: any) {
      console.error('Error fetching JIRA credentials:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch JIRA credentials' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function extractGoogleDocId(description: string | null | undefined): string | undefined {
  if (!description) return undefined;
  const docUrlPattern = /docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/;
  const match = description.match(docUrlPattern);
  return match ? match[1] : undefined;
}

function extractTextFromDoc(doc: any): string {
  if (!doc.body?.content) return '';
  
  let text = '';
  for (const element of doc.body.content) {
    if (element.paragraph) {
      for (const paragraphElement of element.paragraph.elements || []) {
        if (paragraphElement.textRun?.content) {
          text += paragraphElement.textRun.content;
        }
      }
    }
  }
  return text;
}

function groupMeetingsByDate(meetings: any[], scores: any[]): any[] {
  const scoreMap = new Map(scores.filter(s => s).map(s => [s.meetingId, s.totalScore] as [string, number]));
  
  const dateGroups = new Map<string, { total: number; count: number }>();
  
  meetings.forEach(meeting => {
    const date = new Date(meeting.startTime).toLocaleDateString('en-US', { weekday: 'short' });
    const score = scoreMap.get(meeting.id) || 0;
    
    if (!dateGroups.has(date)) {
      dateGroups.set(date, { total: 0, count: 0 });
    }
    
    const group = dateGroups.get(date)!;
    group.total += score;
    group.count += 1;
  });
  
  return Array.from(dateGroups.entries()).map(([date, data]) => ({
    date,
    score: data.count > 0 ? Math.round(data.total / data.count) : 0,
    meetings: data.count,
  }));
}
