import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'lesson_update'
  | 'test_created'
  | 'student_reply'
  | 'parent_reply'
  | 'reply_like'
  | 'announcement_created';

export interface INotification extends Document {
  recipientUserId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: {
      type: String,
      required: true,
      enum: ['lesson_update', 'test_created', 'student_reply', 'parent_reply', 'reply_like', 'announcement_created'],
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, default: '' },
    payload: { type: Schema.Types.Mixed, required: false },
    readAt: { type: Date, required: false, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ?? mongoose.model<INotification>('Notification', notificationSchema);
