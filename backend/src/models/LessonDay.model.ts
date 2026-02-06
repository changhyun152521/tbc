import mongoose, { Schema, Document, Model } from 'mongoose';

export type AttendanceHomeworkValue = 'O' | 'X' | '';

export interface IStudentRecord {
  studentId: mongoose.Types.ObjectId;
  attendance: AttendanceHomeworkValue;
  homework: AttendanceHomeworkValue;
  /** 학생별 비고 */
  note?: string;
}

export interface IPeriod {
  teacherId: mongoose.Types.ObjectId;
  /** 진도 (수업 내용 메모) */
  memo?: string;
  /** 과제 내용 (자유 입력) */
  homeworkDescription?: string;
  /** 과제 마감기한 */
  homeworkDueDate?: Date;
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
  },
  { _id: false }
);

const periodSchema = new Schema<IPeriod>(
  {
    teacherId: { type: Schema.Types.ObjectId, required: true, ref: 'Teacher' },
    memo: { type: String, default: '' },
    homeworkDescription: { type: String, default: '' },
    homeworkDueDate: { type: Date, required: false },
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
