import Tag from '../models/tagModel.js';
import Template from '../models/templateModel.js';


/**
 * @desc Create or update a tag by key (slug)
 * @route POST /api/templates/tags
 * @access Private
 */
export const upsertTag = async (req, res) => {
  try {
    const { key, label, color = '#7e57c2', description = '', scope = 'user', school = null } = req.body || {};
    if (!key || !label) return res.status(400).json({ message: 'key and label are required' });
    const update = { label, color, description };
    if (scope) update.scope = scope;
    if (school) update.school = school;
    if (req.user?._id) update.updated_by = req.user._id;
    if (req.user?._id && !update.created_by) update.created_by = req.user._id;

    const doc = await Tag.findOneAndUpdate({ key }, { $set: update, $setOnInsert: { created_by: req.user?._id || null } }, { new: true, upsert: true });
    res.json(doc);
  } catch (err) {
    console.error('upsertTag error', err);
    res.status(500).json({ message: 'Failed to upsert tag', error: err.message });
  }
};

/**
 * @desc List tags (optionally filter by search or by recency)
 * @route GET /api/templates/tags
 * @access Private
 */
export const listTags = async (req, res) => {
  try {
    const { q = '', limit = 200, recent = '0', sort = '' } = req.query || {};
    const filter = { isArchived: { $ne: true } };
    if (q) {
      filter.$or = [
        { key: { $regex: q, $options: 'i' } },
        { label: { $regex: q, $options: 'i' } },
      ];
    }
    const query = Tag.find(filter);
    // recent=true or sort=recent sorts by last_used desc then usage_count desc, then updatedAt desc
    if (recent === '1' || recent === 'true' || sort === 'recent') {
      query.sort({ last_used: -1, usage_count: -1, updatedAt: -1 });
    }
    const items = await query.limit(Number(limit)).lean();
    res.json(items);
  } catch (err) {
    console.error('listTags error', err);
    res.status(500).json({ message: 'Failed to list tags', error: err.message });
  }
};

/**
 * @desc Soft-delete a tag by key
 * @route DELETE /api/templates/tags/:key
 * @access Private
 */
export const deleteTag = async (req, res) => {
  try {
    const { key } = req.params || {};
    if (!key) return res.status(400).json({ message: 'key is required' });
    const doc = await Tag.findOneAndUpdate({ key }, { $set: { isArchived: true } }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Tag not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteTag error', err);
    res.status(500).json({ message: 'Failed to delete tag', error: err.message });
  }
};

/**
 * @desc Search fields within templates by tag (and optional label substring)
 *       Scans template.fields (grouped or flat) and returns matching fields with template/section metadata.
 * @route GET /api/templates/tags/fields/search?tag=tagKey&label=substring
 * @access Private
 */
export const searchFieldsByTag = async (req, res) => {
  try {
    const tag = String(req.query.tag || '').trim();
    const labelQ = String(req.query.label || '').trim().toLowerCase();
    if (!tag) return res.status(400).json({ message: 'tag is required' });

    const userId = req.user?.id || req.user?._id || req.user?.userId || req.user?.uid || null;
    const school = req.user?.school || req.user?.role?.school || req.user?.schoolId || req.user?.school_id || null;

    // Fetch candidate templates within user's visibility (own or same school), not archived
    const tmplFilter = { isArchived: { $ne: true } };
    if (school) tmplFilter.school = school;
    if (!school && userId) tmplFilter.created_by = userId; // fallback to own templates when no school in context

    const templates = await Template.find(tmplFilter)
      .select('title fields created_by school')
      .limit(250) // safety limit
      .lean();

    const results = [];
    for (const t of templates) {
      const arr = Array.isArray(t.fields) ? t.fields : [];
      // Two shapes supported:
      // 1) Grouped: [{ id, name, fields: [ {id,name,type,placeholder,instructions,tags} ] }]
      // 2) Flat:    [{ id,name,type,placeholder,instructions,tags }]
      const isGrouped = arr.length > 0 && arr[0] && typeof arr[0] === 'object' && Array.isArray(arr[0].fields);

      if (isGrouped) {
        for (const section of arr) {
          const sectionFields = Array.isArray(section.fields) ? section.fields : [];
          for (const f of sectionFields) {
            if (!Array.isArray(f.tags) || !f.tags.includes(tag)) continue;
            const labelStr = String(f.name || f.label || f.id || '').toLowerCase();
            if (labelQ && !labelStr.includes(labelQ)) continue;
            results.push({
              templateId: t._id,
              templateTitle: t.title,
              sectionId: section.id || null,
              sectionName: section.name || null,
              key: f.id || f.key,
              label: f.name || f.label || f.id || f.key,
              type: f.type || 'text',
              placeholder: f.placeholder || '',
              instructions: f.instructions || '',
              tags: Array.isArray(f.tags) ? f.tags : [],
              options: f.options ?? null,
              required: !!f.required,
            });
          }
        }
      } else {
        for (const f of arr) {
          if (!Array.isArray(f.tags) || !f.tags.includes(tag)) continue;
          const labelStr = String(f.name || f.label || f.id || '').toLowerCase();
          if (labelQ && !labelStr.includes(labelQ)) continue;
          results.push({
            templateId: t._id,
            templateTitle: t.title,
            sectionId: null,
            sectionName: null,
            key: f.id || f.key,
            label: f.name || f.label || f.id || f.key,
            type: f.type || 'text',
            placeholder: f.placeholder || '',
            instructions: f.instructions || '',
            tags: Array.isArray(f.tags) ? f.tags : [],
            options: f.options ?? null,
            required: !!f.required,
          });
        }
      }
    }

    // bump usage for this tag key for recents
    try {
      await Tag.findOneAndUpdate(
        { key: tag },
        { $inc: { usage_count: 1 }, $set: { last_used: new Date() } },
        { upsert: true }
      );
    } catch (e) {
      console.warn('Failed to bump tag usage', e?.message || e);
    }

    res.json({ fields: results });
  } catch (err) {
    console.error('searchFieldsByTag error', err);
    res.status(500).json({ message: 'Failed to search fields', error: err.message });
  }
};
