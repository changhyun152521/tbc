import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideoWatchProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  lessonDayId: mongoose.Types.ObjectId;
  periodId: mongoose.Types.ObjectId;
  youtubeVideoId: string;
  durationSec: number;
  watchedSec: number;
  maxPercent: number;
  lastPositionSec: number;
  lastWatchedAt?: Date;
  lastProgressAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const videoWatchProgressSchema = new Schema<IVideoWatchProgress>(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, ref: 'Student' },
    lessonDayId: { type: Schema.Types.ObjectId, required: true, ref: 'LessonDay' },
    periodId: { type: Schema.Types.ObjectId, required: true },
    youtubeVideoId: { type: String, required: true, trim: true },
    durationSec: { type: Number, default: 0 },
    watchedSec: { type: Number, default: 0 },
    maxPercent: { type: Number, default: 0 },
    lastPositionSec: { type: Number, default: 0 },
    lastWatchedAt: { type: Date, required: false },
    lastProgressAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

videoWatchProgressSchema.index({ studentId: 1, lessonDayId: 1, periodId: 1 }, { unique: true });
videoWatchProgressSchema.index({ lessonDayId: 1, periodId: 1 });

export const VideoWatchProgress: Model<IVideoWatchProgress> =
  mongoose.models.VideoWatchProgress ??
  mongoose.model<IVideoWatchProgress>('VideoWatchProgress', videoWatchProgressSchema);
