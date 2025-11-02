import mongoose from 'mongoose';


const FieldGroupDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // slug from group/accordion name
    label: { type: String, default: '' },
    // Array of field definitions contained in this group
    fields: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            label: { type: String, default: '' },
            type: { type: String, default: 'text' },
            placeholder: { type: String, default: '' },
            instructions: { type: String, default: '' },
            tags: { type: [String], default: [] },
            options: { type: mongoose.Schema.Types.Mixed, default: null },
            required: { type: Boolean, default: false },
            defaultValue: { type: mongoose.Schema.Types.Mixed, default: null },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    scope: { type: String, enum: ['user', 'school', 'global'], default: 'school', index: true },
    school: { type: String, default: null, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    usage_count: { type: Number, default: 0 },
    last_used: { type: Date, default: null },
  },
  { timestamps: true }
);

FieldGroupDefinitionSchema.index({ key: 1, scope: 1, school: 1, created_by: 1 }, { unique: true });

export default mongoose.models.FieldGroupDefinition || mongoose.model('FieldGroupDefinition', FieldGroupDefinitionSchema);
