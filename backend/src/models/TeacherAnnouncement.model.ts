import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacherAnnouncement extends Document {
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

const teacherAnnouncementSchema = new Schema<ITeacherAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, default: '' },
    startsAt: { type: String, required: true, trim: true },
    endsAt: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  },
  { timestamps: true }
);

teacherAnnouncementSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export const TeacherAnnouncement: Model<ITeacherAnnouncement> =
  mongoose.models.TeacherAnnouncement ??
  mongoose.model<ITeacherAnnouncement>('TeacherAnnouncement', teacherAnnouncementSchema);
