import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const HANDLE_PX = 5;
const MIN_ROW_PX = 24;
const key = new PluginKey("edgeever-table-row-resize");

// Returns the row whose bottom edge is under the pointer, if any.
const rowAtBottomEdge = (view: EditorView, event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const cell = target?.closest?.("td, th") as HTMLElement | null;
  const tr = cell?.parentElement as HTMLTableRowElement | null;
  if (!cell || !tr || !view.dom.contains(tr)) return null;
  // The border between two rows hit-tests into the lower row, so check the
  // row above as well as the one under the pointer.
  for (const row of [tr, tr.previousElementSibling as HTMLTableRowElement | null]) {
    if (!row) continue;
    const distance = row.getBoundingClientRect().bottom - event.clientY;
    if (distance >= -HANDLE_PX && distance <= HANDLE_PX) return row;
  }
  return null;
};

const rowPos = (view: EditorView, tr: HTMLElement) => {
  const cell = tr.firstElementChild;
  if (!cell) return null;
  const $pos = view.state.doc.resolve(view.posAtDOM(cell, 0));
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === "tableRow") return $pos.before(depth);
  }
  return null;
};

/** Drag the bottom border of a table row to set its minimum height. */
export const tableRowResizing = () => new Plugin({
  key,
  props: {
    handleDOMEvents: {
      mousemove(view, event) {
        if (!view.editable || view.dom.classList.contains("row-resizing")) return false;
        view.dom.classList.toggle("row-resize-hover", Boolean(rowAtBottomEdge(view, event)));
        return false;
      },
      mouseleave(view) {
        view.dom.classList.remove("row-resize-hover");
        return false;
      },
      mousedown(view, event) {
        if (!view.editable || event.button !== 0) return false;
        const tr = rowAtBottomEdge(view, event);
        if (!tr) return false;
        const pos = rowPos(view, tr);
        if (pos == null) return false;
        const startY = event.clientY;
        const startHeight = tr.getBoundingClientRect().height;
        let height = startHeight;
        view.dom.classList.add("row-resizing");
        const move = (e: MouseEvent) => {
          height = Math.max(MIN_ROW_PX, Math.round(startHeight + e.clientY - startY));
          tr.style.height = `${height}px`;
        };
        const finish = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", finish);
          view.dom.classList.remove("row-resizing", "row-resize-hover");
          const node = view.state.doc.nodeAt(pos);
          if (!node || node.type.name !== "tableRow" || height === Math.round(startHeight)) return;
          view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, rowheight: height }));
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", finish);
        event.preventDefault();
        return true;
      },
    },
  },
});
