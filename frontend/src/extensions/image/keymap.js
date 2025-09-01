// src/extensions/image/keymap.js
import { keymap } from 'prosemirror-keymap';

/**
 * Keyboard shortcuts for RichImage.
 * - Mod-Shift-C: toggle crop mode
 * - Mod-Shift-R: rotate +90°
 * - Mod-Shift-E: reset image (effects/crop/rotation)
 * - Arrow keys: nudge when position === 'fixed' (Shift = 10px)
 * - Mod-Alt-Y: open image options sidebar (if provided via options)
 */
export default function imageKeymap(extension) {
  const name = extension.name;

  const isSelectedImage = state => {
    const node = state.selection?.node;
    return node && node.type && node.type.name === name;
  };

  // helper: run a command only when an image node is selected
  const whenImage = (fn) => (state, dispatch, view) => {
    if (!isSelectedImage(state)) return false;
    return fn(state, dispatch, view);
  };

  const rotate = deg => (state, dispatch, view) =>
    view?.chain().focus().rotateImage(deg).run();

  const toggleCrop = () => (state, dispatch, view) =>
    view?.chain().focus().toggleCropMode().run();

  const resetImg = () => (state, dispatch, view) =>
    view?.chain().focus().resetImage().run();

  const nudge = (dx, dy, big = false) => (state, dispatch, view) =>
    view?.chain().focus().nudgeImage({ dx, dy, big }).run();

  const openOptions = () => (state, dispatch, view) => {
    const cb = extension.options?.onOpenImageOptions;
    if (typeof cb === 'function') cb({ editor: view, state });
    return true;
  };

  return {
    'Mod-Shift-c': whenImage(toggleCrop()),
    'Mod-Shift-r': whenImage(rotate(90)),
    'Mod-Alt-Shift-r': whenImage(rotate(-90)),
    'Mod-Shift-e': whenImage(resetImg()),

    // Nudging (when fixed)
    ArrowLeft: whenImage(nudge(-1, 0, false)),
    ArrowRight: whenImage(nudge(1, 0, false)),
    ArrowUp: whenImage(nudge(0, -1, false)),
    ArrowDown: whenImage(nudge(0, 1, false)),

    'Shift-ArrowLeft': whenImage(nudge(-1, 0, true)),
    'Shift-ArrowRight': whenImage(nudge(1, 0, true)),
    'Shift-ArrowUp': whenImage(nudge(0, -1, true)),
    'Shift-ArrowDown': whenImage(nudge(0, 1, true)),

    'Mod-Alt-y': whenImage(openOptions()),
  };
}
