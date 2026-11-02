import type { JSONContent, MarkdownLexerConfiguration, MarkdownParseHelpers, MarkdownRendererHelpers, MarkdownToken, RenderContext } from "@tiptap/core";
import type { Plugin } from "@tiptap/pm/state";
import { columnResizing, columnResizingPluginKey } from "@tiptap/pm/tables";
import { TableKit } from "@tiptap/extension-table";
import { tableRowResizing } from "./table-row-resize";

// GFM cells use <br> for line breaks, including our own table serializer.
// Recognize only this attribute-free token inside cells; arbitrary HTML and
// literal tags inside text/code keep the normal Markdown safety boundary.
const cellTokens = (tokens: MarkdownToken[]): MarkdownToken[] => tokens.map((token) =>
  token.type === "html" && /^<br\s*\/?>$/i.test(token.raw || "")
    ? { type: "br", raw: token.raw }
    : token.tokens ? { ...token, tokens: cellTokens(token.tokens) } : token,
);

// Markdown has no place for column widths or row heights, so they ride along in
// an invisible comment right after the table. It is only read back when it
// directly follows a table; other Markdown tools simply ignore it.
const SIZE_COMMENT = /^\n{1,3}<!-- edgeever-table (\{[^\n]*?\}) -->/;

type TableSizes = { cols: Array<number | null>; rows: Array<number | null> };
type SizedNode = { attrs?: Record<string, unknown>; content?: SizedNode[] };

const parseSizes = (json: string): TableSizes | null => {
  try {
    const value = JSON.parse(json);
    const clean = (list: unknown) => Array.isArray(list)
      ? list.map((n) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : null))
      : [];
    return { cols: clean(value?.cols), rows: clean(value?.rows) };
  } catch {
    return null;
  }
};

export const EdgeEverTableKit = TableKit.extend({
  addExtensions() {
    return (this.parent?.() ?? []).map((extension) => {
      if (extension.name === "tableRow") {
        return extension.extend({
          addAttributes() {
            return {
              rowheight: {
                default: null,
                parseHTML: (element: HTMLElement) => parseInt(element.style.height, 10) || null,
                renderHTML: (attributes: { rowheight?: number | null }) => attributes.rowheight ? { style: `height: ${attributes.rowheight}px` } : {},
              },
            };
          },
          addProseMirrorPlugins(): Plugin[] {
            // Not gated on editor.isEditable: the editor is created read-only and
            // made editable after hydration. The plugin itself checks view.editable.
            return [tableRowResizing()];
          },
        });
      }
      if(extension.name !== "table") return extension;
      const parseMarkdown=extension.config.parseMarkdown!;
      const renderMarkdown=extension.config.renderMarkdown!;
      const baseTokenizer=extension.config.markdownTokenizer!;
      const addProseMirrorPlugins=extension.config.addProseMirrorPlugins as (this: unknown) => Plugin[];
      return extension.extend({
        // Tiptap only installs column resizing when the editor is editable at
        // creation, but the note editor starts read-only until it hydrates. The
        // plugin ignores events while the view is not editable, so always add it.
        addProseMirrorPlugins(): Plugin[] {
          const plugins = addProseMirrorPlugins.call(this);
          const options = (this as unknown as { options: { resizable: boolean; handleWidth: number; cellMinWidth: number; lastColumnResizable: boolean; View: never } }).options;
          if (!options.resizable || plugins.some((plugin) => plugin.spec.key === columnResizingPluginKey)) return plugins;
          return [columnResizing({
            handleWidth: options.handleWidth,
            cellMinWidth: options.cellMinWidth,
            defaultCellMinWidth: options.cellMinWidth,
            View: options.View,
            lastColumnResizable: options.lastColumnResizable,
          }), ...plugins];
        },
        markdownTokenizer: {
          ...baseTokenizer,
          tokenize(src: string, tokens: MarkdownToken[], helper: MarkdownLexerConfiguration) {
            const blank = src.indexOf("\n\n");
            const candidate = blank >= 0 ? src.slice(0, blank) : src;
            const match = SIZE_COMMENT.exec(src.slice(candidate.length));
            if (!match) return baseTokenizer.tokenize(src, tokens, helper);
            const table = baseTokenizer.tokenize(candidate, tokens, helper) ?? helper.blockTokens(candidate)[0];
            const sizes = parseSizes(match[1]);
            if (!table || table.type !== "table" || !sizes) return undefined;
            return { ...table, raw: candidate + match[0], edgeeverSizes: sizes };
          },
        },
        parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
          const cell = (value: { tokens: MarkdownToken[] }) => ({ ...value, tokens: cellTokens(value.tokens) });
          const node = parseMarkdown.call(this as never,{
            ...token,
            header: token.header?.map(cell),
            rows: token.rows?.map((row: Array<{ tokens: MarkdownToken[] }>) => row.map(cell)),
          }, helpers);
          const sizes = (token as { edgeeverSizes?: TableSizes }).edgeeverSizes;
          if (sizes) {
            (node as SizedNode).content?.forEach((row, rowIndex) => {
              if (sizes.rows[rowIndex]) row.attrs = { ...row.attrs, rowheight: sizes.rows[rowIndex] };
              row.content?.forEach((cellNode, colIndex) => {
                if (sizes.cols[colIndex]) cellNode.attrs = { ...cellNode.attrs, colwidth: [sizes.cols[colIndex]] };
              });
            });
          }
          return node;
        },
        renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers, context: RenderContext) {
          const markdown = renderMarkdown.call(this as never, node, helpers, context);
          const rows: Array<number | null> = [];
          const cols: Array<number | null> = [];
          (node as SizedNode).content?.forEach((row, rowIndex) => {
            rows[rowIndex] = (row.attrs?.rowheight as number | null) ?? null;
            row.content?.forEach((cellNode, colIndex) => {
              const width = (cellNode.attrs?.colwidth as number[] | null)?.[0];
              if (width && cols[colIndex] == null) cols[colIndex] = Math.round(width);
            });
          });
          if (!rows.some(Boolean) && !cols.some(Boolean)) return markdown;
          const colCount = (node as SizedNode).content?.[0]?.content?.length ?? 0;
          const sizes = {
            cols: Array.from({ length: colCount }, (_, i) => cols[i] ?? null),
            rows: Array.from(rows, (height) => height ?? null),
          };
          return `${markdown.replace(/\n+$/, "")}\n\n<!-- edgeever-table ${JSON.stringify(sizes)} -->`;
        },
      });
    });
  },
});
