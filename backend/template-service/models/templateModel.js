import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  document_code: {
    type: String,
    default: null
  },
  revision_no: {
    type: Number,
    default: 0
  },
  effectivity: {
    type: Date,
    default: null
  },  
  thumbnailUrl: { type: String, default: null },
  school: { type: String, default: '' },
  pageSetup: { type: mongoose.Schema.Types.Mixed, default: {} },
  logoConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
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
  status: { type: String, enum: ['assigned','draft','pending','approved','published','returned','rejected'], default: 'draft' },
  status_meta: {
    approved_at: { type: Date, default: null },
    published_at: { type: Date, default: null },
    approvals: {
      dean: {
        assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isApproved: { type: Boolean, default: false },
        approved_at: { type: Date, default: null }
      },
      secretary: {
        assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isApproved: { type: Boolean, default: false },
        approved_at: { type: Date, default: null }
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

// to check if both dean & secretary approvals are complete (Virtual)
templateSchema.virtual('isFullyApproved').get(function() {
  try {
    const approvals = this.status_meta?.approvals;
    return !!(approvals?.dean?.approved_at && approvals?.secretary?.approved_at);
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