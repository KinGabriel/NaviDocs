import mongoose from 'mongoose';

const templateHistorySchema = new mongoose.Schema({
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },
  snapshot: {
    pages_json: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    fields: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    pageSetup: { type: mongoose.Schema.Types.Mixed, default: undefined },
    dateFormat: { type: mongoose.Schema.Types.Mixed, default: undefined }
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  note: { type: String, default: '' },
  version_no: { type: Number, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Index by template_id + version_no for fast retrieval
templateHistorySchema.index({ template_id: 1, version_no: -1 });

// Optional unique constraint to prevent duplicate version numbers for same template_id
templateHistorySchema.index({ template_id: 1, version_no: 1 }, { unique: true, sparse: true });

export default mongoose.model('TemplateHistory', templateHistorySchema);
