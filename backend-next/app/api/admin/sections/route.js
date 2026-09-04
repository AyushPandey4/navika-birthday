import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { verifyAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const views = await Event.aggregate([
      { $match: { eventType: 'section_viewed' } },
      { $group: { _id: '$metadata.sectionId', count: { $sum: 1 }, lastViewed: { $max: '$timestamp' } } },
      { $sort: { count: -1 } }
    ]);

    const formatted = views.map((v) => ({
      sectionId: v._id || 'unknown',
      count: v.count,
      lastViewedAt: v.lastViewed
    }));

    return NextResponse.json({ success: true, sections: formatted });
  } catch (err) {
    console.error('[Sections API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch section stats' }, { status: 500 });
  }
}
