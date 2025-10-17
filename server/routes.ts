import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getGoogleCalendarClient } from "./google-calendar";
import { getGoogleDocsClient } from "./google-docs";
import { calculateMeetingScore, extractAgendaFromDescription, extractKeywordsFromNotes } from "./scoring";
import { insertMeetingSchema, insertMeetingScoreSchema, updateUserSettingsSchema } from "@shared/schema";
import { generateWeeklyChallenge, updateChallengeProgress } from "./gamification";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getAuthUrl, getTokensFromCode } from "./google-oauth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  // Reference: blueprint:javascript_log_in_with_replit
  await setupAuth(app);

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

  // Google OAuth - Initiate authentication
  app.get('/auth/google', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authUrl = getAuthUrl(userId); // Pass userId as state
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Error initiating Google OAuth:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate Google OAuth' });
    }
  });

  // Google OAuth - Callback handler
  app.get('/auth/google/callback', async (req: any, res) => {
    try {
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        throw new Error('Missing authorization code or user ID');
      }

      // Exchange code for tokens
      const tokens = await getTokensFromCode(code as string);

      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Save tokens to database
      await storage.upsertUserSettings(userId as string, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });

      // Redirect back to settings page with success message
      res.redirect('/settings?google_connected=true');
    } catch (error: any) {
      console.error('Error in Google OAuth callback:', error);
      res.redirect('/settings?google_error=' + encodeURIComponent(error.message || 'OAuth failed'));
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
