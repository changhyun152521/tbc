import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  school: string;
  grade: string;
  studentPhone: string;
  parentPhone: string;
  userId: mongoose.Types.ObjectId;
  parentUserId: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
    school: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    studentPhone: { type: String, required: true, trim: true },
    parentPhone: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    parentUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    classId: { type: Schema.Types.ObjectId, required: false, ref: 'Class' },
  },
  { timestamps: true }
);

studentSchema.index({ userId: 1 }, { unique: true });
studentSchema.index({ parentUserId: 1 }, { unique: true });
studentSchema.index({ classId: 1 });

export const Student: Model<IStudent> =
  mongoose.models.Student ?? mongoose.model<IStudent>('Student', studentSchema);
