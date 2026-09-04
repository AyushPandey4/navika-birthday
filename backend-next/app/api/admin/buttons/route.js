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

    const clicks = await Event.aggregate([
      { $match: { eventType: 'button_clicked' } },
      { $group: { _id: '$metadata.buttonId', count: { $sum: 1 }, lastClicked: { $max: '$timestamp' } } },
      { $sort: { count: -1 } }
    ]);

    const formatted = clicks.map((c) => ({
      buttonId: c._id || 'unknown',
      count: c.count,
      lastClickedAt: c.lastClicked
    }));

    return NextResponse.json({ success: true, buttons: formatted });
  } catch (err) {
    console.error('[Buttons API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch button stats' }, { status: 500 });
  }
}
