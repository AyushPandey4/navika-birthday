import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { verifyAdminSession } from '@/lib/auth';

const GALLERY_PHOTOS = [
  { id: 'navika-01', label: 'Photo 01', thumb: 'assets/images/nav2.jpeg', caption: 'Frame 1' },
  { id: 'navika-02', label: 'Photo 02', thumb: 'assets/images/nav1.jpeg', caption: 'Frame 2' },
  { id: 'navika-03', label: 'Photo 03', thumb: 'assets/images/nav3.jpeg', caption: 'Frame 3' },
  { id: 'navika-04', label: 'Photo 04', thumb: 'assets/images/nav6.jpeg', caption: 'Frame 4' },
  { id: 'navika-05', label: 'Photo 05', thumb: 'assets/images/nav5.jpeg', caption: 'Frame 5' },
  { id: 'navika-06', label: 'Photo 06', thumb: 'assets/images/nav4.jpeg', caption: 'Frame 6' },
  { id: 'navika-07', label: 'Photo 07', thumb: 'assets/images/nav7.jpeg', caption: 'Frame 7' },
  { id: 'navika-08', label: 'Photo 08', thumb: 'assets/images/nav8.jpeg', caption: 'Frame 8' },
  { id: 'navika-09', label: 'Photo 09', thumb: 'assets/images/nav9.jpeg', caption: 'Frame 9' }
];

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const openedEvents = await Event.find({ eventType: 'photo_opened' });

    const photoMap = {};
    openedEvents.forEach((e) => {
      const pid = e.metadata?.photoId;
      if (!pid) return;
      if (!photoMap[pid]) {
        photoMap[pid] = {
          count: 0,
          firstOpened: e.timestamp,
          lastOpened: e.timestamp,
          sessions: new Set()
        };
      }
      photoMap[pid].count += 1;
      photoMap[pid].sessions.add(e.sessionId);
      if (new Date(e.timestamp) < new Date(photoMap[pid].firstOpened)) {
        photoMap[pid].firstOpened = e.timestamp;
      }
      if (new Date(e.timestamp) > new Date(photoMap[pid].lastOpened)) {
        photoMap[pid].lastOpened = e.timestamp;
      }
    });

    const photos = GALLERY_PHOTOS.map((p) => {
      const data = photoMap[p.id];
      return {
        id: p.id,
        label: p.label,
        thumb: p.thumb,
        caption: p.caption,
        opened: !!data,
        openCount: data ? data.count : 0,
        uniqueSessionsOpened: data ? data.sessions.size : 0,
        firstOpenedAt: data ? data.firstOpened : null,
        lastOpenedAt: data ? data.lastOpened : null
      };
    });

    const total = photos.length;
    const openedCount = photos.filter((p) => p.opened).length;
    const notOpenedCount = total - openedCount;
    const engagementRate = ((openedCount / total) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      summary: {
        totalPhotos: total,
        photosOpened: openedCount,
        photosNotOpened: notOpenedCount,
        engagementRate
      },
      photos
    });
  } catch (err) {
    console.error('[Photos API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch photos analytics' }, { status: 500 });
  }
}
