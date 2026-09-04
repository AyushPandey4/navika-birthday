import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event, ALLOWED_EVENT_TYPES } from '@/models/Event';

// CORS response helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function POST(req) {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.error('[POST /api/events] Database connection returned null. Check MONGODB_URI on Vercel.');
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed. Ensure MONGODB_URI is set in Vercel Environment Variables and Atlas allows 0.0.0.0/0 Network Access.'
        },
        { status: 503, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const { eventType, sessionId, recipientToken, metadata = {}, timestamp } = body;

    // 1. Basic validation
    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'eventType is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 2. Allowlist validation
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid eventType '${eventType}'. Allowed: ${ALLOWED_EVENT_TYPES.join(', ')}`
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    const cleanMetadata = (metadata && typeof metadata === 'object' && !Array.isArray(metadata))
      ? metadata
      : {};

    // 3. Deduplication Logic
    if (eventType === 'gift_opened') {
      const existing = await Event.findOne({ sessionId, eventType: 'gift_opened' });
      if (existing) {
        return NextResponse.json(
          { success: true, duplicated: true, message: 'gift_opened already recorded for this session' },
          { status: 200, headers: corsHeaders() }
        );
      }
    }

    if (eventType === 'section_viewed' && cleanMetadata.sectionId) {
      const existing = await Event.findOne({
        sessionId,
        eventType: 'section_viewed',
        'metadata.sectionId': cleanMetadata.sectionId
      });
      if (existing) {
        return NextResponse.json(
          { success: true, duplicated: true, message: `section_viewed for '${cleanMetadata.sectionId}' already recorded` },
          { status: 200, headers: corsHeaders() }
        );
      }
    }

    if (eventType === 'photo_opened' && cleanMetadata.photoId) {
      const existing = await Event.findOne({
        sessionId,
        eventType: 'photo_opened',
        'metadata.photoId': cleanMetadata.photoId
      });
      if (existing) {
        return NextResponse.json(
          { success: true, duplicated: true, message: `photo_opened for '${cleanMetadata.photoId}' already recorded` },
          { status: 200, headers: corsHeaders() }
        );
      }
    }

    // 4. Save Event
    const newEvent = await Event.create({
      eventType,
      sessionId: sessionId.trim(),
      recipientToken: recipientToken ? String(recipientToken).trim() : null,
      metadata: cleanMetadata,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    return NextResponse.json(
      { success: true, eventId: newEvent._id },
      { status: 201, headers: corsHeaders() }
    );
  } catch (err) {
    console.error('[POST /api/events Error]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing event' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
