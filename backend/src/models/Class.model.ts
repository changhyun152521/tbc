import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClass extends Document {
  name: string;
  teacherIds: mongoose.Types.ObjectId[];
  studentIds: mongoose.Types.ObjectId[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

classSchema.index({ teacherIds: 1 });
classSchema.index({ studentIds: 1 });

export const Class: Model<IClass> =
  mongoose.models.Class ?? mongoose.model<IClass>('Class', classSchema);
