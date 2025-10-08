import mongoose from 'mongoose';

const { Schema } = mongoose;

const FieldSuggestionSchema = new Schema({
  key: { type: String, required: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  scope: { type: String, enum: ['user', 'school'], default: 'user', index: true },
  school: { type: String, default: null, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  count: { type: Number, default: 1 },
  last_used: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.FieldSuggestion || mongoose.model('FieldSuggestion', FieldSuggestionSchema);
