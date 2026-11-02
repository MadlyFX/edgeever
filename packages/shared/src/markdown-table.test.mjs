import { expect, test } from "bun:test";
import { docToMarkdown, markdownToDoc } from "./content.ts";

test("only attribute-free table cell br tokens become hard breaks, preserving the HTML boundary",()=>{
  const source='Outside <br> stays text.\n\n| Header<br>line | Other |\n| --- | --- |\n| **bold<br/>line** &lt;br&gt; `<br>` | <br onclick="bad()"><script>bad()</script> |';
  const doc=markdownToDoc(source),nodes=[];
  const walk=node=>{nodes.push(node);(node.content || []).forEach(walk);};walk(doc);
  expect(nodes.filter(node=>node.type==='hardBreak')).toHaveLength(2);
  expect(nodes.filter(node=>node.type==='text').map(node=>node.text).join('')).toContain('Outside <br> stays text.');
  expect(nodes.filter(node=>node.type==='text').map(node=>node.text).join('')).toContain('<br onclick="bad()"><script>bad()</script>');
  expect(nodes.find(node=>node.text==='<br>' && node.marks?.some(mark=>mark.type==='code'))).toBeDefined();
  const again=markdownToDoc(docToMarkdown(doc)),breaks=[];const collect=node=>{if(node.type==='hardBreak')breaks.push(node);(node.content || []).forEach(collect);};collect(again);
  expect(breaks).toHaveLength(2);
});

test("table column widths and row heights round-trip through an invisible comment",()=>{
  const source='| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<!-- edgeever-table {"cols":[120,null],"rows":[null,60]} -->\n\nAfter.';
  const doc=markdownToDoc(source);
  const table=doc.content.find(node=>node.type==='table');
  expect(table.content[0].content[0].attrs.colwidth).toEqual([120]);
  expect(table.content[0].content[1].attrs?.colwidth ?? null).toBeNull();
  expect(table.content[1].attrs.rowheight).toBe(60);
  expect(doc.content.some(node=>node.type==='paragraph')).toBe(true);
  const out=docToMarkdown(doc);
  expect(out).toContain('<!-- edgeever-table {"cols":[120,null],"rows":[null,60]} -->');
  expect(docToMarkdown(markdownToDoc(out))).toBe(out);
});

test("unsized tables serialize without metadata",()=>{
  const out=docToMarkdown(markdownToDoc('| A |\n| --- |\n| 1 |'));
  expect(out).not.toContain('edgeever-table');
});
