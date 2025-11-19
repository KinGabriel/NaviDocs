import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  document_code: {
    type: String,
    default: null
  },
  revision_no: {
    type: String,
    default: 0
  },
  effectivity: {
    type: Date,
    default: null
  },  
  thumbnailUrl: { type: String, default: null },
  school: { type: String, default: '' },
  pageSetup: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Prefer headerConfig; keep logoConfig for backward compatibility with older records
  headerConfig: { type: mongoose.Schema.Types.Mixed, default: {} },

//  fontSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  dateFormat: { type: mongoose.Schema.Types.Mixed, default: {} },
  fields: { type: [mongoose.Schema.Types.Mixed], default: [] },
  title: {
    type: String,
    required: true,
    trim: true
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  // header: { type: mongoose.Schema.Types.Mixed, default: [] },
  pages_json: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
    default: [
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Start typing your template content...' }
            ]
          }
        ]
      }
    ]
  },
  // footer: { type: mongoose.Schema.Types.Mixed, default: [] },
  status: { type: String, enum: ['assigned','draft','pending','endorsed','approved','published','returned','rejected'], default: 'draft' },
  status_meta: {
  // Top-level lifecycle timestamps and actor references
    published_at: { type: Date, default: null },
    published_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    unpublished_at: { type: Date, default: null },
    unpublished_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submitted_at: { type: Date, default: null },
    unsubmitted_at: { type: Date, default: null },

    approvals: {
      // Optional first stage approver (only required when submitted by Faculty)
      unit_document_controller: {
        assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isApproved: { type: Boolean, default: false },
        approved_at: { type: Date, default: null },
        returned_at: { type: Date, default: null },
      },
      // Approver roles
      lead_document_controller: {
        assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isApproved: { type: Boolean, default: false },
        approved_at: { type: Date, default: null },
        returned_at: { type: Date, default: null },
      },
      document_controller_officer: {
        assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isApproved: { type: Boolean, default: false },
        approved_at: { type: Date, default: null },
        rejected_at: { type: Date, default: null },
      }
    }
  },
  notes: [{
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role_snapshot: { type: String },
    type: { type: String, enum: ['assignment','rejection','change','general'], default: 'general' },
    message: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
  }],
  deadline:{ type: Date, default: null },
  assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

// to check if both approver approvals are complete (Virtual)
templateSchema.virtual('isFullyApproved').get(function() {
  try {
    const approvals = this.status_meta?.approvals || {};
    const leadApproved = !!approvals?.lead_document_controller?.approved_at;
    const officerApproved = !!approvals?.document_controller_officer?.approved_at;
    const unitApproved = !!approvals?.unit_document_controller?.approved_at;
    // If submitted by Faculty, status will be 'pending' at submission time -> require UDC endorsement
    const requiresUDC = this.status === 'pending';
    return requiresUDC ? (leadApproved && officerApproved && unitApproved) : (leadApproved && officerApproved);
  } catch (e) {
    return false;
  }
});
templateSchema.set('toJSON', { virtuals: true });
templateSchema.set('toObject', { virtuals: true });


templateSchema.index({ status: 1 });
templateSchema.index({ created_by: 1 });
templateSchema.index({ title: 'text' }); 
templateSchema.index({ document_code: 1, revision_no: 1 }, { unique: true });


export default mongoose.model('Template', templateSchema);