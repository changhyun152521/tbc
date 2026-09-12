import mongoose, { Schema, Document, Model } from 'mongoose';

export type QuestionVideoUploaderRole = 'admin' | 'teacher';

export interface IPersonalQuestionVideo extends Document {
  studentId: mongoose.Types.ObjectId;
  /** 등록한 강사 (Teacher._id). 관리자 등록 시 없음. 타 강사는 조회·삭제 불가 */
  teacherId?: mongoose.Types.ObjectId | null;
  createdByUserId: mongoose.Types.ObjectId;
  uploaderRole: QuestionVideoUploaderRole;
  /** 목록/모달에 표시할 이름 캐시 */
  uploaderName: string;
  url: string;
  videoId: string;
  title: string;
  durationSec: number;
  watchedSec: number;
  playTimeSec: number;
  maxPercent: number;
  lastPositionSec: number;
  lastWatchedAt?: Date;
  lastProgressAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const personalQuestionVideoSchema = new Schema<IPersonalQuestionVideo>(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, ref: 'Student', index: true },
    teacherId: { type: Schema.Types.ObjectId, required: false, ref: 'Teacher', default: null, index: true },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    uploaderRole: { type: String, required: true, enum: ['admin', 'teacher'] },
    uploaderName: { type: String, trim: true, default: '' },
    url: { type: String, required: true, trim: true },
    videoId: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: '' },
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

personalQuestionVideoSchema.index({ studentId: 1, createdAt: -1 });
personalQuestionVideoSchema.index({ studentId: 1, teacherId: 1, createdAt: -1 });
personalQuestionVideoSchema.index({ studentId: 1, maxPercent: 1 });

export const PersonalQuestionVideo: Model<IPersonalQuestionVideo> =
  mongoose.models.PersonalQuestionVideo ??
  mongoose.model<IPersonalQuestionVideo>('PersonalQuestionVideo', personalQuestionVideoSchema);

/** 모달에서 사라지는 진행률 기준 (대시보드에는 계속 남음) */
export const QUESTION_VIDEO_MODAL_COMPLETE_PERCENT = 80;
