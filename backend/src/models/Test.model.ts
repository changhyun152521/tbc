import mongoose, { Schema, Document, Model } from 'mongoose';

export type TestType = 'weeklyTest' | 'realTest';

export interface IScoreEntry {
  studentId: mongoose.Types.ObjectId;
  score: number;
}

export interface ITest extends Document {
  testType: TestType;
  classId: mongoose.Types.ObjectId;
  date: Date;
  questionCount?: number; // 총 문항수
  scores: IScoreEntry[];
  subject?: string;
  bigUnit?: string;
  smallUnit?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scoreEntrySchema = new Schema<IScoreEntry>(
  {
    studentId: { type: Schema.Types.ObjectId, required: true, ref: 'Student' },
    score: { type: Number, required: true },
  },
  { _id: false }
);

const testSchema = new Schema<ITest>(
  {
    testType: {
      type: String,
      required: true,
      enum: ['weeklyTest', 'realTest'],
    },
    classId: { type: Schema.Types.ObjectId, required: true, ref: 'Class' },
    date: { type: Date, required: true },
    questionCount: { type: Number, min: 0 },
    scores: { type: [scoreEntrySchema], default: [] },
    subject: { type: String, trim: true },
    bigUnit: { type: String, trim: true },
    smallUnit: { type: String, trim: true },
    source: { type: String, trim: true },
  },
  { timestamps: true }
);

testSchema.index({ classId: 1 });
testSchema.index({ date: 1 });

export const Test: Model<ITest> =
  mongoose.models.Test ?? mongoose.model<ITest>('Test', testSchema);
