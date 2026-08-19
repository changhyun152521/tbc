import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement extends Document {
  classId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  /** YYYY-MM-DD (KST 달력일) */
  startsAt: string;
  /** YYYY-MM-DD (KST 달력일) */
  endsAt: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    classId: { type: Schema.Types.ObjectId, required: true, ref: 'Class' },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, default: '' },
    startsAt: { type: String, required: true, trim: true },
    endsAt: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  },
  { timestamps: true }
);

announcementSchema.index({ classId: 1, startsAt: 1, endsAt: 1 });
announcementSchema.index({ classId: 1, isActive: 1 });

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ?? mongoose.model<IAnnouncement>('Announcement', announcementSchema);
