import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { verifyAdminSession } from '@/lib/auth';

const JOURNEY_MILESTONES = [
  { id: 'visit', label: 'Website Opened', type: 'page_view' },
  { id: 'gift', label: 'Gift Opened', type: 'gift_opened' },
  { id: 'story', label: 'Origin Story Viewed', type: 'section_viewed', sectionId: 'story' },
  { id: 'nicknames', label: 'Nicknames Section Viewed', type: 'section_viewed', sectionId: 'nicknames' },
  { id: 'timeline', label: 'Timeline Viewed', type: 'section_viewed', sectionId: 'timeline' },
  { id: 'gallery', label: 'Photo Gallery Viewed', type: 'section_viewed', sectionId: 'gallery' },
  { id: 'photo', label: 'Photos Opened in Lightbox', type: 'photo_opened' },
  { id: 'playful', label: "Playful 'Don't Click' Explored", type: 'button_clicked', buttonId: 'dont-click' },
  { id: 'reflection', label: 'Reflection Read', type: 'section_viewed', sectionId: 'reflection' },
  { id: 'final', label: 'Final Birthday Wish Reached', type: 'section_viewed', sectionId: 'final-message' }
];

export async function GET(req, { params }) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sessionId } = params;
    await connectDB();

    const events = await Event.find({ sessionId }).sort({ timestamp: 1 });

    if (!events.length) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const first = events[0].timestamp;
    const last = events[events.length - 1].timestamp;
    const durationSec = Math.max(0, Math.floor((new Date(last) - new Date(first)) / 1000));

    const journeyChecklist = JOURNEY_MILESTONES.map((m) => {
      const match = events.find((e) => {
        if (e.eventType !== m.type) return false;
        if (m.sectionId && e.metadata?.sectionId !== m.sectionId) return false;
        if (m.buttonId && e.metadata?.buttonId !== m.buttonId) return false;
        return true;
      });

      return {
        id: m.id,
        label: m.label,
        completed: !!match,
        timestamp: match ? match.timestamp : null
      };
    });

    return NextResponse.json({
      success: true,
      sessionId,
      startedAt: first,
      lastActiveAt: last,
      durationSeconds: durationSec,
      totalEvents: events.length,
      recipientToken: events[0].recipientToken || null,
      journeyChecklist,
      events
    });
  } catch (err) {
    console.error('[Session Details API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch session details' }, { status: 500 });
  }
}
