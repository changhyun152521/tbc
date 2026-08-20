import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttendanceHomeworkValue = 'O' | 'X' | '';

export interface IStudentRecord {
  studentId: mongoose.Types.ObjectId;
  attendance: AttendanceHomeworkValue;
  homework: AttendanceHomeworkValue;
  /** 학생 코멘트 (학생 메인에 노출) */
  note?: string;
  /** 학부모 코멘트 (학부모 메인에 노출) */
  parentNote?: string;
  /** 학생 계정 답글 */
  studentReply?: string;
  studentReplyCreatedAt?: Date;
  studentReplyUpdatedAt?: Date;
  studentReplyLikedTeacherIds?: mongoose.Types.ObjectId[];
  /** 학부모 계정 답글 */
  parentReply?: string;
  parentReplyCreatedAt?: Date;
  parentReplyUpdatedAt?: Date;
  parentReplyLikedTeacherIds?: mongoose.Types.ObjectId[];
}

export interface IReviewVideo {
  _id?: mongoose.Types.ObjectId;
  url: string;
  videoId: string;
  title?: string;
  order: number;
  /** 영상 길이(초). 최초 재생 시 저장되어 미시청 영상도 분모에 포함 */
  durationSec?: number;
}

export interface IPeriod {
  _id?: mongoose.Types.ObjectId;
  /** 1-based 교시 번호 (수업일 내 유일) */
  periodNumber?: number;
  teacherId: mongoose.Types.ObjectId;
  /** 진도 (수업 내용 메모) */
  memo?: string;
  /** 과제 내용 (자유 입력) */
  homeworkDescription?: string;
  /** 과제 마감기한 */
  homeworkDueDate?: Date;
  /** 복습 영상 목록 (다중 지원) */
  reviewVideos?: IReviewVideo[];
  /** @deprecated 단일 영상 URL (하위 호환용) */
  reviewVideoUrl?: string;
  /** @deprecated 단일 영상 ID (하위 호환용) */
  reviewVideoId?: string;
  records: IStudentRecord[];
}

export interface ILessonDay extends Document {
  classId: mongoose.Types.ObjectId;
  date: Date;
  periods: IPeriod[];
  createdAt: Date;
  updatedAt: Date;
}

const studentRecordSchema = new Schema<IStudentRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, ref: 'Student' },
    attendance: { type: String, enum: ['O', 'X', ''], default: '' },
    homework: { type: String, enum: ['O', 'X', ''], default: '' },
    note: { type: String, default: '' },
    parentNote: { type: String, default: '' },
    studentReply: { type: String, default: '' },
    studentReplyCreatedAt: { type: Date, required: false },
    studentReplyUpdatedAt: { type: Date, required: false },
    studentReplyLikedTeacherIds: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    parentReply: { type: String, default: '' },
    parentReplyCreatedAt: { type: Date, required: false },
    parentReplyUpdatedAt: { type: Date, required: false },
    parentReplyLikedTeacherIds: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
  },
  { _id: false }
);

const reviewVideoSchema = new Schema<IReviewVideo>(
  {
    url: { type: String, default: '', trim: true },
    videoId: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
  },
  { _id: true }
);

const periodSchema = new Schema<IPeriod>(
  {
    periodNumber: { type: Number, min: 1 },
    teacherId: { type: Schema.Types.ObjectId, required: true, ref: 'Teacher' },
    memo: { type: String, default: '' },
    homeworkDescription: { type: String, default: '' },
    homeworkDueDate: { type: Date, required: false },
    reviewVideos: { type: [reviewVideoSchema], default: [] },
    reviewVideoUrl: { type: String, default: '', trim: true },
    reviewVideoId: { type: String, default: '', trim: true },
    records: { type: [studentRecordSchema], default: [] },
  },
  { _id: true }
);

const lessonDaySchema = new Schema<ILessonDay>(
  {
    classId: { type: Schema.Types.ObjectId, required: true, ref: 'Class' },
    date: { type: Date, required: true },
    periods: { type: [periodSchema], default: [] },
  },
  { timestamps: true }
);

lessonDaySchema.index({ classId: 1, date: 1 }, { unique: true });

export const LessonDay: Model<ILessonDay> =
  mongoose.models.LessonDay ?? mongoose.model<ILessonDay>('LessonDay', lessonDaySchema);
