import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'admin' | 'student' | 'parent' | 'teacher';

export interface IUser extends Document {
  loginId: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    loginId: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'student', 'parent', 'teacher'],
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

userSchema.index({ loginId: 1 }, { unique: true });
userSchema.index({ role: 1 });

export const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', userSchema);
