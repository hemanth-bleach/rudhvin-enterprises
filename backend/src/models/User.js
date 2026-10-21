import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createEmbeddedModel } from '../config/embeddedDb.js';

let UserModel;

if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'embedded') {
  const userSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      password: { type: String, required: true, minlength: 6, select: false },
      role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
      isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
  );

  userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  UserModel = mongoose.models.User || mongoose.model('User', userSchema);
} else {
  UserModel = createEmbeddedModel('users', {
    name: '',
    email: '',
    password: '',
    role: 'admin',
    isActive: true
  });

  const originalCreate = UserModel.create;
  UserModel.create = async function (data) {
    const cloned = { ...data };
    if (cloned.password && !cloned.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(10);
      cloned.password = await bcrypt.hash(cloned.password, salt);
    }
    const item = await originalCreate(cloned);
    item.comparePassword = async (candidate) => bcrypt.compare(candidate, item.password);
    return item;
  };

  const originalFindOne = UserModel.findOne;
  UserModel.findOne = function (query) {
    const qb = originalFindOne(query);
    const origExec = qb.exec.bind(qb);
    qb.exec = async () => {
      const doc = await origExec();
      if (doc) {
        doc.comparePassword = async (candidate) => bcrypt.compare(candidate, doc.password);
      }
      return doc;
    };
    return qb;
  };
}

export const User = UserModel;
