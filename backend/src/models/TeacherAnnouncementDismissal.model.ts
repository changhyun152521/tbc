import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacherAnnouncementDismissal extends Document {
  userId: mongoose.Types.ObjectId;
  announcementId: mongoose.Types.ObjectId;
  /** YYYY-MM-DD. 이 날짜까지(포함) 숨김. 오늘=하루 숨김, 9999-12-31=계속 보지 않기 */
  hideUntil: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherAnnouncementDismissalSchema = new Schema<ITeacherAnnouncementDismissal>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    announcementId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'TeacherAnnouncement',
    },
    hideUntil: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

teacherAnnouncementDismissalSchema.index({ userId: 1, announcementId: 1 }, { unique: true });

export const TeacherAnnouncementDismissal: Model<ITeacherAnnouncementDismissal> =
  mongoose.models.TeacherAnnouncementDismissal ??
  mongoose.model<ITeacherAnnouncementDismissal>(
    'TeacherAnnouncementDismissal',
    teacherAnnouncementDismissalSchema
  );
