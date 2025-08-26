import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true }, 
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const storageSchema = new mongoose.Schema({
  folderName: { type: String, required: true },
  owner: { type: String, required: true },
  visibility: { type: String, enum: ['public', 'private', 'restricted'], default: 'private' },
  allowedSchools: [{ type: String }],
  allowedDepartments: [{ type: String }],
  allowedUsers: [{ type: String }],
  files: [fileSchema],
  filledOutDocuments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


export default mongoose.model('Storage', storageSchema);
