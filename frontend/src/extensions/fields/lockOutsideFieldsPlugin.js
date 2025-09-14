// src/extensions/fields/lockOutsideFieldsPlugin.js
import { Plugin, PluginKey } from "prosemirror-state";

export function createLockOutsideFieldsPlugin({
  initialPolicy = "off", // "off" | "template" | "document"
  nodeTypeName = "editableField",
  keyName = "lock-outside-fields",
} = {}) {
  let policy = initialPolicy;
  const key = new PluginKey(keyName);

  const isInsideField = ($pos) => {
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d).type.name === nodeTypeName) return true;
    }
    return false;
  };

  const plugin = new Plugin({
    key,
    filterTransaction(tr, state) {
      if (policy === "off") return true;
      if (!tr.docChanged) return true;

      const { $from, $to } = state.selection;
      const fromIn = isInsideField($from);
      const toIn = isInsideField($to);

      if (policy === "template") {
        // In TEMPLATE mode: block edits that touch inside a field
        return !(fromIn || toIn);
      }
      if (policy === "document") {
        // In DOCUMENT mode: allow edits only inside fields
        return fromIn && toIn;
      }
      return true;
    },
  });

  const setPolicy = (next) => { policy = next; };
  return { plugin, setPolicy };
}
