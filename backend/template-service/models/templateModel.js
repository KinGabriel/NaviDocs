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
    enum: ['8.5 x 11', '8.5 x 13', 'A4'],
    default: '8.5 x 13'
  },
  margin: {
    top: { type: Number, default: 1 },
    bottom: { type: Number, default: 1 },
    left: { type: Number, default: 1 },
    right: { type: Number, default: 1 }
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  header: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Start typing your template content...'
            }
          ]
        }
      ]
    }
  },
  footer: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  status: {
    approved: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    draft: { type: Boolean, default: true },
    pending_approval: { type: Boolean, default: false },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    published_at: { type: Date, default: null },
    submitted_for_approval_at: { type: Date, default: null }
  },
  approval_workflow: {
    required_approvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    current_step: { type: Number, default: 0 },
    completed_approvals: [{
      approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approved_at: { type: Date },
      comments: { type: String }
    }]
  },
  assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

templateSchema.index({ isDraft: 1 });
templateSchema.index({ 'status.draft': 1 });
templateSchema.index({ 'status.published': 1 });
templateSchema.index({ 'status.pending_approval': 1 });
templateSchema.index({ created_by: 1 });
templateSchema.index({ title: 'text' }); 

export default mongoose.model('Template', templateSchema);