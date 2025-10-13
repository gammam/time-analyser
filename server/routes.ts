import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableGoogleCalendarClient } from "./google-calendar";
import { getUncachableGoogleDocsClient } from "./google-docs";
import { calculateMeetingScore, extractAgendaFromDescription, extractKeywordsFromNotes } from "./scoring";
import { insertMeetingSchema, insertMeetingScoreSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sync meetings from Google Calendar
  app.post("/api/meetings/sync", async (req, res) => {
    try {
      const userId = "demo-user"; // TODO: Replace with actual auth
      const { timeMin, timeMax } = req.body;

      const calendar = await getUncachableGoogleCalendarClient();
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
          hasAgenda: agenda.hasAgenda,
          agendaLength: agenda.length,
          participants: attendees.length,
          durationMinutes: duration,
          actionItemsCount: 0,
          attentionPointsCount: 0,
        });

        // Upsert score to prevent duplicates
        await storage.upsertMeetingScore({
          meetingId: meeting.id,
          ...score,
        });

        meetings.push(meeting);
      }

      res.json({ success: true, meetings, count: meetings.length });
    } catch (error: any) {
      console.error('Error syncing meetings:', error);
      res.status(500).json({ error: error.message || 'Failed to sync meetings' });
    }
  });

  // Get meetings for a date range
  app.get("/api/meetings", async (req, res) => {
    try {
      const userId = "demo-user";
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
  app.post("/api/meetings/:id/analyze-doc", async (req, res) => {
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
      const docs = await getUncachableGoogleDocsClient();
      const doc = await docs.documents.get({ documentId: googleDocId });

      const content = extractTextFromDoc(doc.data);
      const { actionItems, attentionPoints } = extractKeywordsFromNotes(content);

      // Recalculate score with notes data
      const agenda = extractAgendaFromDescription(meeting.description);
      const duration = (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60);

      const score = calculateMeetingScore({
        hasAgenda: agenda.hasAgenda,
        agendaLength: agenda.length,
        participants: meeting.participants,
        durationMinutes: duration,
        actionItemsCount: actionItems,
        attentionPointsCount: attentionPoints,
      });

      // Upsert to prevent duplicate scores
      await storage.upsertMeetingScore({ meetingId: id, ...score });

      res.json({ success: true, score, content: content.substring(0, 500) });
    } catch (error: any) {
      console.error('Error analyzing doc:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze document' });
    }
  });

  // Get score statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const userId = "demo-user";
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

  const httpServer = createServer(app);
  return httpServer;
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
  const scoreMap = new Map(scores.map(s => s ? [s.meetingId, s.totalScore] : []));
  
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
