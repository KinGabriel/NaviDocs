import mongoose from 'mongoose';

const { Schema } = mongoose;

// Approval subdocument (used in status_meta)
const ApprovalSchema = new Schema({
  assigned_to: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isApproved: { type: Boolean, default: false },
  approved_at: { type: Date, default: null }
}, { _id: false });

const StatusMetaSchema = new Schema({
  approvals: {
    type: Map,
    of: ApprovalSchema,
    default: {}
  },
  published_at: { type: Date, default: null },
  published_by: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const FromTemplateSchema = new Schema({
  id: { type: Schema.Types.ObjectId, ref: 'Template', default: null },
  title: { type: String, default: '' },
  document_code: { type: String, default: null },
  revision_no: { type: String, default: null },
  effectivity: { type: Date, default: null },
  fields: { type: [Schema.Types.Mixed], default: [] },
  pages_json: { type: [Schema.Types.Mixed], default: [] },
  pageSetup: { type: Schema.Types.Mixed, default: {} },
  headerConfig: { type: Schema.Types.Mixed, default: {} },

  dateFormat: { type: Schema.Types.Mixed, default: {} },
  assigned: { type: [Schema.Types.ObjectId], ref: 'User', default: [] }
}, { _id: false });

const DocumentSchema = new Schema({
  title: { type: String, required: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: String, default: '' },
  department: { type: String, default: null },
  template_id: { type: Schema.Types.ObjectId, ref: 'Template', default: null },
  from_template: { type: FromTemplateSchema, default: () => ({}) },
  status: { type: String, default: 'draft' },
  field_values: { type: Schema.Types.Mixed, default: {} },
  notes: { type: [Schema.Types.Mixed], default: [] },
  assigned: [{ userId: { type: String, default: null }, access: { type: String, enum: ['viewer','editor'], default: 'viewer' } }],
  isArchived: { type: Boolean, default: false },
  submission_link: { type: String, default: null },
  deadline: { type: Date, default: null },
  thumbnailUrl: { type: String, default: null }
  ,
  // exported PDF links (path returned by file-service)
  export_links: [{ path: { type: String, default: null }, created_at: { type: Date, default: null }, created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null } }],
}, { timestamps: true });

// Useful indexes
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ created_by: 1 });
DocumentSchema.index({ title: 'text' });
DocumentSchema.index({ document_code: 1, revision_no: 1 }, { unique: true, partialFilterExpression: { document_code: { $type: 'string' } } });

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
