import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  document_code: {
    type: String,
    required: true
  },
  revision_no: {
    type: Number,
    default: 0
  },
  effectivity: {
    type: Date,
    default: null
  },
  page_no: {
    type: Number,
    default: 1
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  document_size: {
    type: String,
  enum: ['letter','legal','A4'],
  default: 'legal'
  },
  margin: {
    top: { type: Number, default: 1 },
    bottom: { type: Number, default: 1 },
    left: { type: Number, default: 1 },
    right: { type: Number, default: 1 }
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  header: { type: mongoose.Schema.Types.Mixed, default: [] },
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
  body: { type: String, default: '' },
  footer: { type: mongoose.Schema.Types.Mixed, default: [] },
  status: { type: String, enum: ['draft','pending','approved','published'], default: 'draft' },
  status_meta: {
    approved_at: { type: Date, default: null },
    published_at: { type: Date, default: null },
    approvals: {
      dean: {
        approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approved_at: { type: Date, default: null }
      },
      secretary: {
        approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
  assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
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