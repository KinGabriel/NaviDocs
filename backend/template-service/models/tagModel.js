import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, 
    label: { type: String, required: true },
    color: { type: String, default: '#7e57c2' },
    scope: { type: String, enum: ['user', 'school', 'global'], default: 'user', index: true },
    school: { type: String, default: null, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    usage_count: { type: Number, default: 0 },
    last_used: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TagSchema.index({ key: 1, scope: 1, school: 1, created_by: 1 }, { unique: true, partialFilterExpression: { key: { $exists: true } } });

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);
