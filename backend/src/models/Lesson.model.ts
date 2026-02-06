import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILesson extends Document {
  classId: mongoose.Types.ObjectId;
  date: Date;
  period: string;
  progress: string;
  homework: string;
  homeworkDueDate?: Date;
  attendanceStatus: string;
  homeworkDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    classId: { type: Schema.Types.ObjectId, required: true, ref: 'Class' },
    date: { type: Date, required: true },
    period: { type: String, required: true, trim: true },
    progress: { type: String, default: '', trim: true },
    homework: { type: String, default: '', trim: true },
    homeworkDueDate: { type: Date, required: false },
    attendanceStatus: { type: String, default: '', trim: true },
    homeworkDone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

lessonSchema.index({ classId: 1, date: 1 });

export const Lesson: Model<ILesson> =
  mongoose.models.Lesson ?? mongoose.model<ILesson>('Lesson', lessonSchema);
