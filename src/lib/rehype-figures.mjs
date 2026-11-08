// Inline local SVG figures from the synced docs and give them a caption.
//
// Markdown in src/content/docs writes a figure as an image paragraph followed by an
// italic "Figure N." paragraph, which GitHub renders as an <img> and a caption line.
// Here the SVG is inlined, so it picks up the site's fonts, and the pair becomes
// <figure><svg/><figcaption/></figure>.
import fs from 'node:fs';
import path from 'node:path';

const onlyChild = (node, tag) => {
  const kids = (node.children ?? []).filter((c) => !(c.type === 'text' && c.value.trim() === ''));
  return kids.length === 1 && kids[0].type === 'element' && kids[0].tagName === tag ? kids[0] : null;
};

export default function rehypeFigures() {
  return (tree, file) => {
    const base = file.path ? path.dirname(file.path) : null;
    if (!base) return;
    const walk = (parent) => {
      const kids = parent.children ?? [];
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];
        if (node.type !== 'element') continue;
        const img = node.tagName === 'p' ? onlyChild(node, 'img') : null;
        const src = img?.properties?.src;
        if (typeof src === 'string' && src.endsWith('.svg') && !/^[a-z]+:|^\//i.test(src)) {
          const svgPath = path.resolve(base, decodeURI(src));
          if (!fs.existsSync(svgPath)) throw new Error(`${file.path}: figure ${src} not found`);
          const svg = fs.readFileSync(svgPath, 'utf8').replace(/^<\?xml[^>]*>\s*/, '');
          const figure = {
            type: 'element',
            tagName: 'figure',
            properties: { className: ['doc-figure'] },
            children: [{ type: 'raw', value: svg }],
          };
          // A following paragraph that is a single <em> starting with "Figure" is the caption.
          let j = i + 1;
          while (j < kids.length && kids[j].type === 'text' && kids[j].value.trim() === '') j++;
          const em = kids[j]?.type === 'element' && kids[j].tagName === 'p' ? onlyChild(kids[j], 'em') : null;
          const caption = em?.children?.map((c) => c.value ?? '').join('') ?? '';
          if (em && caption.startsWith('Figure')) {
            figure.children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: em.children });
            kids.splice(i + 1, j - i);
          }
          kids[i] = figure;
          continue;
        }
        walk(node);
      }
    };
    walk(tree);
  };
}
