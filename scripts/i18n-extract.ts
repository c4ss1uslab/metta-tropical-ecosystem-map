/**
 * i18n extraction helper.
 *
 * Scans the UI source for user-facing English strings (JSX text, user-facing
 * attributes, string/template literals that read like prose) and reports the
 * ones that have no pt-BR entry yet in src/i18n/ptBR.ui.ts.
 *
 *   npx tsx scripts/i18n-extract.ts            # list missing strings
 *   npx tsx scripts/i18n-extract.ts --json     # JSON array of missing strings
 *   npx tsx scripts/i18n-extract.ts --all      # list every candidate string
 *
 * Template literals are reported as patterns: `${count} entities` -> "{0} entities".
 */
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');

const SKIP_FILES = [/data[\\/]/, /i18n[\\/]/, /vite-env\.d\.ts$/, /main\.tsx$/, /firebase\.ts$/];
const UI_ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt', 'label']);
const NON_UI_ATTRS = new Set(['className', 'id', 'key', 'type', 'href', 'src', 'd', 'fill', 'stroke', 'viewBox', 'role', 'name', 'value', 'htmlFor', 'target', 'rel', 'accept', 'style', 'transform', 'points', 'markerEnd', 'fontFamily', 'textAnchor', 'dominantBaseline', 'mode', 'autoComplete', 'inputMode', 'xmlns', 'clipPath', 'mask', 'filter', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'fillRule', 'clipRule', 'gradientUnits', 'pointerEvents', 'cursor', 'method', 'encType', 'download', 'data-testid']);
const NON_UI_CALLEES = /^(console\.\w+|localStorage\.\w+|sessionStorage\.\w+|doc|collection|getElementById|querySelector(All)?|addEventListener|removeEventListener|setAttribute|getAttribute|classList\.\w+|require|import|fetch|match|replace|replaceAll|split|includes|startsWith|endsWith|indexOf|test|RegExp|new RegExp|cn|clsx|toLocaleString|toLocaleDateString|padStart|padEnd|join|Symbol|getItem|setItem|removeItem|has|get|delete|setProperty|createElement|toFixed|localeCompare|normalize)$/;

const looksLikeCode = (s: string) => {
  if (!/[A-Za-z]/.test(s)) return true;
  if (/^https?:|^mailto:|^www\.|^#[0-9a-f]{3,8}$|^rgba?\(|^data:|^\/|^\.\/|^@/i.test(s)) return true;
  if (/^[a-z0-9_\-:\/\.\[\]%#=*>]+$/.test(s)) return true; // single lowercase token / keys
  if (/^[A-Z0-9_]+$/.test(s) && s.length > 1) return true; // CONSTANT_KEYS
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(s)) return true; // camelCase
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/i.test(s)) return true; // snake_case
  // tailwind / css class strings
  const tokens = s.split(/\s+/);
  const twLike = tokens.filter(t => /^(-?[a-z]+(-[a-z0-9\[\]#.%\/]+)+|[a-z]+:[^\s]+|flex|grid|block|hidden|inline|relative|absolute|fixed|sticky|truncate|italic|uppercase|lowercase|capitalize|underline|shadow|rounded|border|transition|shrink-0|grow|static|contents|group|peer|invisible|visible|sr-only)$/.test(t)).length;
  if (tokens.length > 0 && twLike / tokens.length >= 0.5) return true;
  if (/^[\d\s.,:%+\-–—×x/()]+$/.test(s)) return true;
  return false;
};

const ENTITIES: Record<string, string> = {
  quot: '"', amp: '&', apos: "'", lt: '<', gt: '>', nbsp: ' ', ldquo: '“', rdquo: '”',
  lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•', times: '×', rarr: '→', larr: '←'
};
const decodeEntities = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function collect(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (s: string, file: string) => {
    const n = norm(decodeEntities(s));
    if (!n || n.length < 2 || looksLikeCode(n)) return;
    // Plain .ts modules hold lots of lowercase matching aliases (header synonyms, keywords): skip them
    if (!file.endsWith('.tsx') && !/[A-Z]/.test(n)) return;
    // Bracketed column-letter aliases such as "[E] Quadrant" are matching keys, not UI
    if (/^\[[a-z]{1,2}\]/i.test(n)) return;
    if (!out.has(n)) out.set(n, new Set());
    out.get(n)!.add(path.relative(ROOT, file));
  };

  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
  });

  for (const file of walk(SRC)) {
    if (SKIP_FILES.some(r => r.test(file))) continue;
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

    const isNonUiContext = (node: ts.Node): boolean => {
      let p: ts.Node | undefined = node.parent;
      while (p) {
        if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isTypeNode(p)) return true;
        if (ts.isJsxAttribute(p)) {
          const name = p.name.getText();
          if (UI_ATTRS.has(name)) return false;
          if (NON_UI_ATTRS.has(name) || name.startsWith('data-') || name.startsWith('on')) return true;
          return false;
        }
        if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
          const callee = p.expression.getText().replace(/^.*?\.(?=[a-zA-Z]+$)/, m => m);
          const last = p.expression.getText();
          const short = last.split('.').slice(-2).join('.');
          if (NON_UI_CALLEES.test(last) || NON_UI_CALLEES.test(short) || NON_UI_CALLEES.test(last.split('.').pop()!)) return true;
          void callee;
          return false;
        }
        if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
        if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
        if (ts.isCaseClause(p) && p.expression === node) return true;
        if (ts.isPropertyAssignment(p) && p.name === node) return true;
        if (ts.isPropertyAssignment(p)) {
          const key = p.name.getText().replace(/['"]/g, '');
          if (/^(id|key|className|color|bg|border|text|fill|stroke|icon|type|value|href|url|field|column|col|path|dotBg|dotBorder|badgeBg|badgeText|badgeBorder|accent|hex|font|style|mode|status|state|tag|source|level|category|quadrant|version|date|sha|repo|branch|author)$/.test(key)) return true;
          return false;
        }
        if (ts.isBlock(p) || ts.isSourceFile(p)) return false;
        p = p.parent;
      }
      return false;
    };

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) {
        add(node.getText(), file);
      } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (!isNonUiContext(node)) add(node.text, file);
      } else if (ts.isTemplateExpression(node)) {
        if (!isNonUiContext(node)) {
          let s = node.head.text;
          node.templateSpans.forEach((span, i) => { s += `{${i}}` + span.literal.text; });
          if (s.replace(/\{\d+\}/g, '').replace(/[^A-Za-z]/g, '').length >= 3) add(s, file);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

async function main() {
  const found = collect();
  let existing: Record<string, string> = {};
  let ignored = new Set<string>();
  try {
    const mod = await import(path.join(SRC, 'i18n', 'ptBR.ui.ts'));
    existing = mod.PT_BR_UI || {};
    ignored = new Set(mod.PT_BR_UI_IGNORE || []);
  } catch { /* first run */ }
  const all = process.argv.includes('--all');
  const missing = [...found.keys()].filter(k => all || (!(k in existing) && !ignored.has(k))).sort();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(missing, null, 1));
  } else {
    missing.forEach(m => console.log(`${m}\t[${[...found.get(m)!].join(', ')}]`));
    console.error(`\n${missing.length} ${all ? 'candidate' : 'untranslated'} strings (of ${found.size} total).`);
  }
}
main();
