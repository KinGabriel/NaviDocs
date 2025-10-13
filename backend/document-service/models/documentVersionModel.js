import mongoose from 'mongoose';

const { Schema } = mongoose;

const VersionDataSchema = new Schema({
  document_id: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
  version_no: { type: Number, required: true },
  field_values: { type: Schema.Types.Mixed, default: {} },
  notes: { type: [Schema.Types.Mixed], default: [] },
  isBookmarked: { type: Boolean, default: false },
  last_activity_at: { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

VersionDataSchema.index({ document_id: 1 }, { unique: true });

export default mongoose.models.VersionData || mongoose.model('DocumentHistory', VersionDataSchema);
