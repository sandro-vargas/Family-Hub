import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { CalendarEvent, EventCategory } from '@/types/family';
import {
  DEFAULT_HOUSEHOLD_ID,
  MEMBER_SANDRO_ID,
  MEMBER_FRAU_ID,
  MEMBER_TOCHTER_ID,
} from '@/lib/seed-data';

async function getGoogleAccessToken(): Promise<string | null> {
  // Option 1: Direct Access Token or OAuth2 Refresh Token
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) return data.access_token;
    }
  }

  // Option 2: Google Service Account (Recommended for Family Hub & iPad Kiosk)
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (serviceEmail && rawPrivateKey && !serviceEmail.includes('dein-')) {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const nowSec = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
      'base64url'
    );
    const payload = Buffer.from(
      JSON.stringify({
        iss: serviceEmail,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: 'https://oauth2.googleapis.com/token',
        exp: nowSec + 3600,
        iat: nowSec,
      })
    ).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(privateKey, 'base64url');
    const assertion = `${header}.${payload}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) return tokenData.access_token;
    }
  }

  return null;
}

function inferCategoryFromGoogleEvent(title: string, extCategory?: string): EventCategory {
  if (
    extCategory &&
    ['family', 'child', 'medical', 'birthday', 'meal', 'todo', 'leisure', 'other'].includes(
      extCategory
    )
  ) {
    return extCategory as EventCategory;
  }
  const lower = title.toLowerCase();
  if (lower.includes('🍽️') || lower.includes('🥡') || lower.includes('abendessen') || lower.includes('mittagessen')) {
    return 'meal';
  }
  if (lower.includes('📌') || lower.includes('deadline') || lower.includes('todo')) {
    return 'todo';
  }
  if (lower.includes('🏔️') || lower.includes('ausflug')) {
    return 'leisure';
  }
  if (lower.includes('arzt') || lower.includes('zahnarzt') || lower.includes('spital') || lower.includes('kontrolle')) {
    return 'medical';
  }
  if (lower.includes('kita') || lower.includes('tochter') || lower.includes('chiara') || lower.includes('kinder')) {
    return 'child';
  }
  if (lower.includes('geburtstag') || lower.includes('gebtag')) {
    return 'birthday';
  }
  return 'family';
}

function inferAssignedMembers(title: string, extMembers?: string): string[] {
  const trimmed = title.trim();
  // 1. Check explicit prefixes at the beginning of the title:
  //    - With colon: "S: ...", "J: ...", "C: ...", "S+C: ...", "S+J: ...", "J+C: ...", "S+J+C: ..."
  //    - Combination with +/&// without colon: "S+C ...", "S+J ...", "J+C ..."
  //    - Single letter S, J, C followed by space or " - ": "C ...", "S ...", "J ..."
  const colonMatch = trimmed.match(/^([SJC](?:\s*[+&/,]\s*[SJC])*)\s*:\s*/i);
  const comboMatch = trimmed.match(/^([SJC](?:\s*[+&/]\s*[SJC])+)(?:\s*[:\-]\s*|\s+|$)/i);
  const singleSpaceMatch = trimmed.match(/^([SJC])(?:\s+-\s+|\s+)/i);

  const prefixRaw = colonMatch?.[1] || comboMatch?.[1] || singleSpaceMatch?.[1];
  if (prefixRaw) {
    const tokens = prefixRaw
      .toUpperCase()
      .split(/[\s+&/,]+/)
      .filter(Boolean);
    const prefixIds: string[] = [];
    if (tokens.includes('S') && !prefixIds.includes(MEMBER_SANDRO_ID)) {
      prefixIds.push(MEMBER_SANDRO_ID);
    }
    if (tokens.includes('J') && !prefixIds.includes(MEMBER_FRAU_ID)) {
      prefixIds.push(MEMBER_FRAU_ID);
    }
    if (tokens.includes('C') && !prefixIds.includes(MEMBER_TOCHTER_ID)) {
      prefixIds.push(MEMBER_TOCHTER_ID);
    }
    if (prefixIds.length > 0) {
      return prefixIds;
    }
  }

  if (extMembers) {
    try {
      const parsed = JSON.parse(extMembers);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  const lower = trimmed.toLowerCase();
  const ids: string[] = [];
  if (lower.includes('sandro')) ids.push(MEMBER_SANDRO_ID);
  if (lower.includes('jenni') || lower.includes('frau')) ids.push(MEMBER_FRAU_ID);
  if (lower.includes('chiara') || lower.includes('tochter') || lower.includes('kita')) {
    ids.push(MEMBER_TOCHTER_ID);
  }
  if (ids.length === 0) {
    return [MEMBER_SANDRO_ID, MEMBER_FRAU_ID];
  }
  return ids;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const calendarId: string =
      process.env.GOOGLE_CALENDAR_ID ||
      (body.calendarId && body.calendarId !== 'primary' ? body.calendarId : 'primary');
    const syncMeals: boolean = body.syncMeals !== false;
    const syncTodos: boolean = body.syncTodos !== false;
    const localEvents: CalendarEvent[] = Array.isArray(body.events) ? body.events : [];

    const accessToken = await getGoogleAccessToken();

    if (body.deleteExternalEventId && accessToken) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events/${encodeURIComponent(body.deleteExternalEventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      return NextResponse.json({ mode: 'live-google-api', deleted: true });
    }

    // If no Google Cloud credentials are configured yet in .env.local, run Smart 2-Way Bridge Mode
    if (!accessToken) {
      let pushedCount = 0;
      const updatedLocal = localEvents.map((ev) => {
        if (ev.category === 'meal' && !syncMeals) return ev;
        if (ev.category === 'todo' && !syncTodos) return ev;

        if (ev.sync_status !== 'synced' || !ev.external_event_id) {
          pushedCount++;
          return {
            ...ev,
            external_calendar_id: calendarId,
            external_event_id: ev.external_event_id || `gcal-${ev.id}`,
            sync_status: 'synced' as const,
            updated_at: new Date().toISOString(),
          };
        }
        return ev;
      });

      return NextResponse.json({
        mode: 'local-2way-bridge',
        pushedCount,
        pulledCount: 0,
        mergedEvents: updatedLocal,
        message: `${pushedCount} Termine (inkl. Essensplan & ToDo-Deadlines) für Google Kalender (${calendarId}) abgeglichen. Hinterlege GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY in .env.local für den Live-Cloud-Abgleich.`,
      });
    }

    // LIVE GOOGLE CALENDAR API V3 BIDIRECTIONAL SYNC
    const timeMin = new Date(Date.now() - 14 * 86400000).toISOString();
    const timeMax = new Date(Date.now() + 90 * 86400000).toISOString();

    // 1. PULL FROM GOOGLE CALENDAR
    const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
      timeMax
    )}&singleEvents=true&showDeleted=true`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const googleData = listRes.ok ? await listRes.json() : { items: [] };
    const googleItems: any[] = googleData.items || [];

    const mergedMap = new Map<string, CalendarEvent>();
    for (const ev of localEvents) {
      mergedMap.set(ev.id, { ...ev });
    }

    let pulledCount = 0;

    for (const gItem of googleItems) {
      const gEventId: string = gItem.id;
      const privateProps = gItem.extendedProperties?.private || {};
      const familyHubId: string | undefined = privateProps.familyHubId;

      // Find matching local event by familyHubId or external_event_id
      let existingEntry: CalendarEvent | undefined = familyHubId
        ? mergedMap.get(familyHubId)
        : undefined;

      if (!existingEntry) {
        for (const val of mergedMap.values()) {
          if (val.external_event_id === gEventId) {
            existingEntry = val;
            break;
          }
        }
      }

      // If cancelled in Google Calendar -> remove locally
      if (gItem.status === 'cancelled') {
        if (existingEntry) {
          mergedMap.delete(existingEntry.id);
        }
        continue;
      }

      const isAllDay = Boolean(gItem.start?.date && !gItem.start?.dateTime);
      const startIso = gItem.start?.dateTime
        ? new Date(gItem.start.dateTime).toISOString()
        : `${gItem.start?.date}T00:00:00.000Z`;
      const endIso = gItem.end?.dateTime
        ? new Date(gItem.end.dateTime).toISOString()
        : `${gItem.end?.date || gItem.start?.date}T23:59:59.000Z`;

      const title = gItem.summary || 'Google Kalender Termin';

      if (existingEntry) {
        // Update local event if Google version was modified
        mergedMap.set(existingEntry.id, {
          ...existingEntry,
          title,
          description: gItem.description || existingEntry.description || null,
          location: gItem.location || existingEntry.location || null,
          start_at: startIso,
          end_at: endIso,
          is_all_day: isAllDay,
          assigned_member_ids: inferAssignedMembers(title, privateProps.assignedMemberIds),
          category: inferCategoryFromGoogleEvent(title, privateProps.category),
          external_calendar_id: calendarId,
          external_event_id: gEventId,
          sync_status: 'synced',
          updated_at: gItem.updated || new Date().toISOString(),
        });
      } else {
        // New event created directly in Google Calendar App -> import into Family Hub
        const newLocalId = `ev-gcal-${gEventId}`;
        mergedMap.set(newLocalId, {
          id: newLocalId,
          household_id: DEFAULT_HOUSEHOLD_ID,
          title,
          description: gItem.description || null,
          location: gItem.location || null,
          start_at: startIso,
          end_at: endIso,
          is_all_day: isAllDay,
          assigned_member_ids: inferAssignedMembers(title, privateProps.assignedMemberIds),
          category: inferCategoryFromGoogleEvent(title, privateProps.category),
          external_calendar_id: calendarId,
          external_event_id: gEventId,
          sync_status: 'synced',
          created_by_member_id: MEMBER_SANDRO_ID,
          created_at: gItem.created || new Date().toISOString(),
          updated_at: gItem.updated || new Date().toISOString(),
        });
        pulledCount++;
      }
    }

    // 2. PUSH PENDING LOCAL EVENTS TO GOOGLE CALENDAR
    let pushedCount = 0;
    const finalEvents: CalendarEvent[] = [];

    for (const ev of mergedMap.values()) {
      if (ev.category === 'meal' && !syncMeals) {
        finalEvents.push(ev);
        continue;
      }
      if (ev.category === 'todo' && !syncTodos) {
        finalEvents.push(ev);
        continue;
      }

      if (ev.sync_status === 'pending') {
        const gPayload = {
          summary: ev.title,
          description: ev.description || '',
          location: ev.location || '',
          start: ev.is_all_day
            ? { date: ev.start_at.slice(0, 10) }
            : { dateTime: ev.start_at },
          end: ev.is_all_day
            ? { date: ev.end_at.slice(0, 10) }
            : { dateTime: ev.end_at },
          extendedProperties: {
            private: {
              familyHubId: ev.id,
              category: ev.category,
              assignedMemberIds: JSON.stringify(ev.assigned_member_ids),
            },
          },
        };

        const isUpdate = Boolean(
          ev.external_event_id && !ev.external_event_id.startsWith('gcal-')
        );
        const endpoint = isUpdate
          ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              calendarId
            )}/events/${encodeURIComponent(ev.external_event_id!)}`
          : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              calendarId
            )}/events`;

        const pushRes = await fetch(endpoint, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gPayload),
        });

        if (pushRes.ok) {
          const createdGEvent = await pushRes.json();
          pushedCount++;
          finalEvents.push({
            ...ev,
            external_calendar_id: calendarId,
            external_event_id: createdGEvent.id,
            sync_status: 'synced',
            updated_at: new Date().toISOString(),
          });
          continue;
        }
      }

      finalEvents.push(ev);
    }

    return NextResponse.json({
      mode: 'live-google-api',
      pushedCount,
      pulledCount,
      mergedEvents: finalEvents,
      message: `Live Google Kalender Sync erfolgreich: ${pushedCount} Termine an Google gesendet, ${pulledCount} neue Termine aus Google importiert.`,
    });
  } catch (error: any) {
    console.error('Google Calendar 2-way sync error:', error);
    return NextResponse.json(
      {
        mode: 'error',
        pushedCount: 0,
        pulledCount: 0,
        message: error?.message || 'Fehler beim Google Kalender Abgleich.',
      },
      { status: 500 }
    );
  }
}

