import mongoose from 'mongoose';

export const ALLOWED_EVENT_TYPES = [
  'page_view',
  'gift_opened',
  'button_clicked',
  'section_viewed',
  'photo_opened',
  'photo_closed',
  'photo_next',
  'photo_previous'
];

const EventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      enum: {
        values: ALLOWED_EVENT_TYPES,
        message: 'Invalid eventType: {VALUE}'
      },
      index: true
    },
    sessionId: {
      type: String,
      required: [true, 'sessionId is required'],
      trim: true,
      maxlength: [120, 'sessionId cannot exceed 120 characters'],
      index: true
    },
    recipientToken: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, 'recipientToken cannot exceed 100 characters'],
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound indexes
EventSchema.index({ sessionId: 1, eventType: 1 });
EventSchema.index({ eventType: 1, timestamp: -1 });

export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
