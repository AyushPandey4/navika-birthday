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

    const sessions = await Event.aggregate([
      {
        $group: {
          _id: '$sessionId',
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          totalEvents: { $sum: 1 },
          recipientToken: { $first: '$recipientToken' },
          eventTypes: { $addToSet: '$eventType' },
          photosOpened: {
            $addToSet: {
              $cond: [{ $eq: ['$eventType', 'photo_opened'] }, '$metadata.photoId', '$$REMOVE']
            }
          }
        }
      },
      { $sort: { lastSeen: -1 } },
      { $limit: 100 }
    ]);

    const formattedSessions = sessions.map((s) => ({
      sessionId: s._id,
      recipientToken: s.recipientToken || null,
      startedAt: s.firstSeen,
      lastActiveAt: s.lastSeen,
      totalEvents: s.totalEvents,
      giftOpened: s.eventTypes.includes('gift_opened'),
      photosOpenedCount: s.photosOpened ? s.photosOpened.length : 0
    }));

    return NextResponse.json({
      success: true,
      count: formattedSessions.length,
      sessions: formattedSessions
    });
  } catch (err) {
    console.error('[Sessions API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to aggregate sessions' }, { status: 500 });
  }
}
