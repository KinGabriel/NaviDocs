
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true }, 
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  visibility: { type: String, enum: ['public', 'private', 'restricted'], default: 'private' },
  allowedUsers: [{
    userId: { type: String, required: true },
    role: { type: String, required: true },
    viaFiles: { type: Boolean, default: false }
  }],
  uploadedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const File = mongoose.model('File', fileSchema);

const storageSchema = new mongoose.Schema({
  folderName: { type: String, required: true },
  owner: { type: String, required: true },
  visibility: { type: String, enum: ['public', 'private', 'restricted'], default: 'private' },
  allowedSchools: [{ type: String }],
  allowedDepartments: [{ type: String }],
  allowedUsers: [{
    userId: { type: String, required: true },
    role: { type: String, required: true },
    viaFiles: { type: Boolean, default: false }
  }],
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Storage', default: null },
  files: [fileSchema],
  filledOutDocuments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


export default mongoose.model('Storage', storageSchema);
