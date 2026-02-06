import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacher extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

teacherSchema.index({ userId: 1 }, { unique: true });

export const Teacher: Model<ITeacher> =
  mongoose.models.Teacher ?? mongoose.model<ITeacher>('Teacher', teacherSchema);
