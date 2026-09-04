import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { verifyAdminSession } from '@/lib/auth';

const GALLERY_PHOTOS_COUNT = 9;

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

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const [
      totalEvents,
      pageViews,
      buttonClicks,
      sectionViews,
      earliestEvent,
      latestEvent,
      giftOpenedEvent,
      distinctSessions,
      distinctPhotos
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ eventType: 'page_view' }),
      Event.countDocuments({ eventType: 'button_clicked' }),
      Event.countDocuments({ eventType: 'section_viewed' }),
      Event.findOne().sort({ timestamp: 1 }),
      Event.findOne().sort({ timestamp: -1 }),
      Event.findOne({ eventType: 'gift_opened' }).sort({ timestamp: 1 }),
      Event.distinct('sessionId'),
      Event.distinct('metadata.photoId', { eventType: 'photo_opened' })
    ]);

    const hasVisited = pageViews > 0 || totalEvents > 0;
    const giftOpened = !!giftOpenedEvent;

    let quickStatus = 'waiting';
    let statusHeading = '⏳ WAITING FOR VISIT';
    let statusSubtext = 'The website has not recorded any activity yet.';

    if (giftOpened) {
      quickStatus = 'gift_opened';
      statusHeading = '🎁 SHE OPENED THE GIFT';
      statusSubtext = `First opened on ${new Date(giftOpenedEvent.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })}`;
    } else if (hasVisited) {
      quickStatus = 'visited';
      statusHeading = '👀 WEBSITE VISITED';
      statusSubtext = "The website was opened, but the gift hasn't been opened yet.";
    }

    const journey = await Promise.all(
      JOURNEY_MILESTONES.map(async (m) => {
        const query = { eventType: m.type };
        if (m.sectionId) query['metadata.sectionId'] = m.sectionId;
        if (m.buttonId) query['metadata.buttonId'] = m.buttonId;

        const record = await Event.findOne(query).sort({ timestamp: 1 });
        return {
          id: m.id,
          label: m.label,
          completed: !!record,
          firstCompletedAt: record ? record.timestamp : null
        };
      })
    );

    const uniquePhotosOpened = distinctPhotos.filter(Boolean).length;
    const photoEngagementRate = ((uniquePhotosOpened / GALLERY_PHOTOS_COUNT) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      status: {
        code: quickStatus,
        heading: statusHeading,
        subtext: statusSubtext,
        firstVisit: earliestEvent ? earliestEvent.timestamp : null,
        lastActivity: latestEvent ? latestEvent.timestamp : null,
        giftOpened,
        giftOpenedAt: giftOpenedEvent ? giftOpenedEvent.timestamp : null
      },
      stats: {
        totalEvents,
        pageViews,
        uniqueSessions: distinctSessions.length,
        buttonsClicked: buttonClicks,
        sectionsViewed: sectionViews,
        totalPhotos: GALLERY_PHOTOS_COUNT,
        photosOpened: uniquePhotosOpened,
        photosNotOpened: GALLERY_PHOTOS_COUNT - uniquePhotosOpened,
        photoEngagementRate
      },
      journey
    });
  } catch (err) {
    console.error('[Overview API Error]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch overview' }, { status: 500 });
  }
}
