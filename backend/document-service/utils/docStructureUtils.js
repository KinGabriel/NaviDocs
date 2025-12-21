// ProseMirror/Document structure utilities for tables and node cloning

export const cloneNode = (node) => {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(cloneNode);
  const cloned = { ...node };
  if (Array.isArray(cloned.content)) {
    cloned.content = cloned.content.map(cloneNode);
  }
  if (cloned.attrs && typeof cloned.attrs === 'object') {
    cloned.attrs = { ...cloned.attrs };
  }
  return cloned;
};

export const findTables = (doc) => {
  const tables = [];
  const walk = (node, path = []) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'table') {
      tables.push({ node, path: [...path] });
    }
    if (Array.isArray(node.content)) {
      node.content.forEach((child, idx) => {
        walk(child, [...path, idx]);
      });
    }
  };
  walk(doc);
  return tables;
};

export const addRowToTable = (tableNode, newFieldKeys = [], newFieldLabels = []) => {
  if (!Array.isArray(tableNode.content) || tableNode.content.length === 0) {
    return tableNode;
  }

  const rows = tableNode.content.filter((n) => n && n.type === 'tableRow');
  if (rows.length === 0) return tableNode;

  const lastRowIndex = tableNode.content
    .map((n, idx) => ({ n, idx }))
    .filter(({ n }) => n && n.type === 'tableRow')
    .pop()?.idx;

  if (lastRowIndex === undefined) return tableNode;

  const lastRow = tableNode.content[lastRowIndex];

  const newRow = {
    type: 'tableRow',
    attrs: lastRow.attrs ? { ...lastRow.attrs } : {},
    content: Array.isArray(lastRow.content)
      ? lastRow.content.map((cell) => ({
          type: 'tableCell',
          attrs: cell.attrs ? { ...cell.attrs } : {},
          content: Array.isArray(cell.content)
            ? cell.content.map((para) => {
                if (para.type === 'paragraph') {
                  return {
                    type: 'paragraph',
                    attrs: para.attrs ? { ...para.attrs } : {},
                    content: Array.isArray(para.content)
                      ? para.content.map((node) => {
                          if (node.type === 'editableField') {
                            return {
                              type: 'editableField',
                              attrs: { ...node.attrs, is_added: true },
                            };
                          }
                          return cloneNode(node);
                        })
                      : [],
                  };
                }
                return cloneNode(para);
              })
            : [],
        }))
      : [],
  };

  newRow.attrs._addedRow = true;
  newRow.attrs._addedAt = new Date().toISOString();

  if (Array.isArray(newFieldKeys) && newFieldKeys.length > 0) {
    let fieldIdx = 0;
    const updateKeys = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'editableField' && node.attrs && fieldIdx < newFieldKeys.length) {
        node.attrs.key = newFieldKeys[fieldIdx];
        if (Array.isArray(newFieldLabels) && newFieldLabels[fieldIdx]) {
          node.attrs.placeholder = newFieldLabels[fieldIdx];
        }
        node.attrs.is_added = true;
        fieldIdx++;
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(updateKeys);
      }
    };
    updateKeys(newRow);
  }

  const clonedTable = cloneNode(tableNode);
  clonedTable.content.splice(lastRowIndex + 1, 0, newRow);
  return clonedTable;
};
