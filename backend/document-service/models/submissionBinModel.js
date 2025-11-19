import mongoose from 'mongoose';

const { Schema } = mongoose;

const SubmissionNoteSchema = new Schema({
  type: { type: String, enum: ['general','returned','resubmitted','comment'], default: 'general' },
  message: { type: String, default: '' },
  by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  role: { type: String, default: null }, // Track the role of the person who made this note
  at: { type: Date, default: Date.now },
}, { _id: false });

const SubmissionItemSchema = new Schema({
  documents: { type: [Schema.Types.ObjectId], ref: 'Document', default: [] },
  template: { type: Schema.Types.ObjectId, ref: 'Template', required: true },
  faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  instructions: { type: String, default: '' },
  status: { type: String, enum: ['assigned','submitted','returned','approved','rejected'], default: 'assigned' },
  submitted_at: { type: Date, default: null },
  returned_at: { type: Date, default: null },
  returned_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  approved_at: { type: Date, default: null },
  approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: [SubmissionNoteSchema], default: [] },
  views: { type: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, document: { type: Schema.Types.ObjectId, ref: 'Document' }, at: { type: Date } }], default: [] },
  viewReminderSent: { type: Boolean, default: false },
}, { _id: true, timestamps: false });

const SubmissionBinSchema = new Schema({
  title: { type: String, required: true },
  instructions: { type: String, default: '' },
  department: { type: String, default: null },
  school: { type: String, default: '' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Department Head
  route_to: { type: String, enum: ['secretary','dean',null], default: null },
  deadline: { type: Date, default: null },
  template_ids: { type: [Schema.Types.ObjectId], ref: 'Template', default: [] },
  faculty_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  submissions: { type: [SubmissionItemSchema], default: [] },
  is_forwarded: { type: Boolean, default: false },
  forwarded_at: { type: Date, default: null },
  forwarded_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  target_scope: { type: String, enum: ['department','selected'], default: 'department' },
  status: { type: String, enum: ['active','completed','archived'], default: 'active' },
}, { timestamps: true });

SubmissionBinSchema.index({ department: 1, status: 1 });
SubmissionBinSchema.index({ created_by: 1 });
SubmissionBinSchema.index({ school: 1, is_forwarded: 1 });
SubmissionBinSchema.index({ 'submissions.documents': 1 });

export default mongoose.models.SubmissionBin || mongoose.model('SubmissionBin', SubmissionBinSchema);
