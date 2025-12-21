// Utilities for field/key/label handling across grouped or flat fields

export const incKey = (oldKey) => {
  if (!oldKey) return null;
  const m = String(oldKey).match(/^(.+?)\s*\((\d+)\)$/);
  return m ? `${m[1]} (${parseInt(m[2], 10) + 1})` : `${oldKey} (1)`;
};

export const incLabel = (oldLabel) => {
  if (!oldLabel) return null;
  const m = String(oldLabel).match(/^(.*?)(\d+)(.*)$/);
  return m ? `${m[1]}${parseInt(m[2], 10) + 1}${m[3]}` : `${oldLabel} (1)`;
};

// Build an index for fields by id, supporting grouped structures
// Returns { index: Map(id -> { def, groupId }), baseFields: normalized array }
export const buildFieldIndex = (fieldsArray) => {
  const baseFields = Array.isArray(fieldsArray) ? JSON.parse(JSON.stringify(fieldsArray)) : [];
  const index = new Map();
  baseFields.forEach((entry) => {
    if (!entry) return;
    if (Array.isArray(entry.fields)) {
      const groupId = entry.id || null;
      entry.fields.forEach((f) => {
        if (!f) return;
        const fid = f.id || f.key;
        if (fid) index.set(String(fid), { def: f, groupId });
      });
    } else {
      const fid = entry.id || entry.key;
      if (fid) index.set(String(fid), { def: entry, groupId: null });
    }
  });
  return { index, baseFields };
};

// Collect editable fields from the last row of a table; derive base labels from index
// Returns { collected: Array<{ key, label }>, targetGroupId }
export const collectEditableFieldsFromLastRow = (tableNode, fieldIndex) => {
  const rows = tableNode?.content?.filter((n) => n && n.type === 'tableRow') || [];
  const lastRow = rows[rows.length - 1];
  const collected = [];
  let targetGroupId = null;
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'editableField' && node.attrs) {
      const key = node.attrs.key;
      const rec = key ? fieldIndex.get(String(key)) : null;
      const baseLabel = rec?.def?.label || key;
      const groupId = node.attrs.groupId || rec?.groupId || null;
      if (!targetGroupId && groupId) targetGroupId = groupId;
      collected.push({ key, label: baseLabel });
    }
    if (Array.isArray(node.content)) node.content.forEach(collect);
  };
  collect(lastRow);
  return { collected, targetGroupId };
};

// Merge new field defs into fields patch, respecting grouped structure
export const mergeNewFieldDefsIntoFields = (fieldsPatch, baseFields, newFieldDefs, targetGroupId) => {
  let nextFields = Array.isArray(fieldsPatch)
    ? JSON.parse(JSON.stringify(fieldsPatch))
    : JSON.parse(JSON.stringify(baseFields));
  const hasGroups = nextFields.some((e) => Array.isArray(e?.fields));
  if (hasGroups) {
    let gIdx = typeof targetGroupId === 'string' ? nextFields.findIndex((g) => g && String(g.id) === String(targetGroupId)) : -1;
    if (gIdx < 0) gIdx = nextFields.findIndex((g) => Array.isArray(g?.fields));
    if (gIdx >= 0) {
      const existingIds = new Set((nextFields[gIdx].fields || []).map((f) => String(f.id || '')));
      const merged = Array.isArray(nextFields[gIdx].fields) ? [...nextFields[gIdx].fields] : [];
      newFieldDefs.forEach((f) => {
        const fid = String(f.id || '');
        if (fid && !existingIds.has(fid)) {
          existingIds.add(fid);
          merged.push(f);
        }
      });
      nextFields[gIdx].fields = merged;
    }
  } else {
    const existingIds = new Set(nextFields.map((f) => String(f.id || f.key || f.name || '')));
    newFieldDefs.forEach((f) => {
      const fid = String(f.id || '');
      if (fid && !existingIds.has(fid)) {
        existingIds.add(fid);
        nextFields.push(f);
      }
    });
  }
  return nextFields;
};
