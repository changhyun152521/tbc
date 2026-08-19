import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideoWatchProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  lessonDayId: mongoose.Types.ObjectId;
  periodId: mongoose.Types.ObjectId;
  /** 교시 내 영상 순서 인덱스 (0-based). 단일 영상이면 0 */
  videoIndex: number;
  youtubeVideoId: string;
  durationSec: number;
  /** 영상에서 실제로 재생된 고유 초 수 (진행률 계산) */
  watchedSec: number;
  /** 플레이어가 PLAYING 상태였던 누적 시간 (같은 구간 재시청 포함) */
  playTimeSec: number;
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
    videoIndex: { type: Number, default: 0 },
    youtubeVideoId: { type: String, required: true, trim: true },
    durationSec: { type: Number, default: 0 },
    watchedSec: { type: Number, default: 0 },
    playTimeSec: { type: Number, default: 0 },
    maxPercent: { type: Number, default: 0 },
    lastPositionSec: { type: Number, default: 0 },
    lastWatchedAt: { type: Date, required: false },
    lastProgressAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

videoWatchProgressSchema.index({ studentId: 1, lessonDayId: 1, periodId: 1, videoIndex: 1 }, { unique: true });
videoWatchProgressSchema.index({ lessonDayId: 1, periodId: 1 });

export const VideoWatchProgress: Model<IVideoWatchProgress> =
  mongoose.models.VideoWatchProgress ??
  mongoose.model<IVideoWatchProgress>('VideoWatchProgress', videoWatchProgressSchema);
