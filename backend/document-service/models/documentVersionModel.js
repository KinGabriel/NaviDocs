import mongoose from 'mongoose';

const { Schema } = mongoose;

const VersionDataSchema = new Schema({
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  version_no: { type: Number, required: true },
  field_values: { type: mongoose.Schema.Types.Mixed, default: {} }, // change field values at this version
  snapshot: { type: mongoose.Schema.Types.Mixed, default: {} }, // full snapshot at this version
  note: { type: String, default: '' },
  isBookmarked: { type: Boolean, default: false },
  last_activity_at: { type: Date, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// allow multiple versions per document; enforce uniqueness per (document_id, version_no)
VersionDataSchema.index({ document_id: 1, version_no: 1 }, { unique: true });

export default mongoose.models.VersionData || mongoose.model('DocumentHistory', VersionDataSchema);
