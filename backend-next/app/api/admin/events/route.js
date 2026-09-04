import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(req) {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    await connectDB();

    let query = {};
    switch (filter) {
      case 'page_views':
        query.eventType = 'page_view';
        break;
      case 'buttons':
        query.eventType = 'button_clicked';
        break;
      case 'sections':
        query.eventType = 'section_viewed';
        break;
      case 'photos':
        query.eventType = { $in: ['photo_opened', 'photo_closed', 'photo_next', 'photo_previous'] };
        break;
      case 'gift':
        query.eventType = 'gift_opened';
        break;
      case 'all':
      default:
        break;
    }

    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(limit, 500));

    return NextResponse.json({ success: true, count: events.length, events });
  } catch (err) {
    console.error('[Events Feed API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}
