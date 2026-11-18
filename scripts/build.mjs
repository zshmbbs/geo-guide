/**
 * build.mjs —— 把 raw/*.json（从浏览器导出的公众号正文）转换成
 *   articles/*.md   便于阅读 / 搜索 / AI 抓取的 Markdown
 *   pages/*.html    保留原始排版的静态快照
 *   assets/images/  本地化后的图片
 * 无第三方依赖，Node 18+ 即可运行：node scripts/build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'raw');

const SERIES = '企业GEO实战指南';
const AUTHOR = '何承泽';

// 文章顺序 + 英文 slug（决定文件名，改动会影响已有链接）
const SLUGS = [
  '01-seo-vs-geo',
  '02-how-ai-ranks-you',
  '03-ai-platform-indexing',
  '04-brand-vs-conversion',
  '05-content-playbook',
  '06-query-mining',
  '07-website-as-datasource',
  '08-defend-ai-poisoning',
  '09-b2b-manufacturing',
  '10-local-business',
  '11-monitoring-selfcheck',
];

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);

/* ---------------- HTML -> 语法树 ---------------- */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', mdash: '—', ndash: '–', hellip: '…', middot: '·', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(raw))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

function parseHTML(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const tokens = html.match(/<[^>]*>|[^<]+/g) || [];
  for (const t of tokens) {
    if (t[0] !== '<') {
      stack[stack.length - 1].children.push({ tag: '#text', text: decodeEntities(t) });
      continue;
    }
    if (t.startsWith('</')) {
      const tag = t.slice(2, -1).trim().toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const m = t.match(/^<([a-zA-Z0-9-]+)([\s\S]*?)\/?>$/);
    if (!m) continue;
    const tag = m[1].toLowerCase();
    const node = { tag, attrs: parseAttrs(m[2]), children: [] };
    stack[stack.length - 1].children.push(node);
    if (!VOID.has(tag) && !t.endsWith('/>')) stack.push(node);
  }
  return root;
}

/* ---------------- 语法树 -> Markdown ---------------- */

function isHidden(node) {
  const st = node.attrs?.style || '';
  return /visibility:\s*hidden/.test(st) || /display:\s*none/.test(st);
}

function bgColor(style) {
  const m = style.match(/background(?:-color)?\s*:\s*([^;]+)/);
  return m ? m[1].trim() : '';
}

function isWhiteish(c) {
  if (!c || /transparent|none/i.test(c)) return true;
  const nums = c.match(/\d+/g);
  if (nums && nums.length >= 3) {
    const [r, g, b] = nums.map(Number);
    return r >= 245 && g >= 245 && b >= 245;
  }
  return /^#(fff|ffffff)$/i.test(c);
}

function isCallout(node) {
  if (isHidden(node)) return false;
  const st = node.attrs?.style || '';
  const bar = st.match(/border-left\s*:\s*([\d.]+)px/);
  const hasBar = bar && parseFloat(bar[1]) >= 2;
  const hasBg = !isWhiteish(bgColor(st));
  return Boolean(hasBg || hasBar);
}

// 公众号里大量标题其实是「加粗 + 放大」的 <p>，这里还原成 Markdown 标题
function pseudoHeading(node, text) {
  const st = node.attrs?.style || '';
  if (!text || text.length > 40 || /[。，、；：]$/.test(text)) return null;
  const size = Number((st.match(/font-size:\s*([\d.]+)px/) || [])[1] || 0);
  const bold = /font-weight:\s*(bold|[6-9]00)/.test(st) || (node.children || []).some(c => /font-weight:\s*(bold|[6-9]00)/.test(c.attrs?.style || '') || c.tag === 'strong' || c.tag === 'b');
  if (!bold) return null;
  if (/^[一二三四五六七八九十]+[、.．]/.test(text)) return `## ${text}`;
  if (size >= 18 || /^第[一二三四五六七八九十百\d]+[步讲节章]/.test(text) || /^\d+[、.．]/.test(text)) return `### ${text}`;
  return null;
}

function textOf(node) {
  if (node.tag === '#text') return node.text;
  if (node.tag === 'br') return '\n';
  if (node.tag === 'img') return '';
  return (node.children || []).map(textOf).join('');
}

function cellText(node) {
  const t = (node.children || []).map(inline).join('').replace(/\s+/g, ' ').trim();
  return t.replace(/\|/g, '\\|');
}

function tableToMd(node) {
  const rows = [];
  const walk = (n) => {
    if (n.tag === 'tr') {
      rows.push((n.children || []).filter(c => c.tag === 'th' || c.tag === 'td').map(cellText));
      return;
    }
    for (const c of n.children || []) walk(c);
  };
  walk(node);
  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill('')];
  const head = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  const line = (r) => `| ${r.join(' | ')} |`;
  return [line(head), `| ${head.map(() => '---').join(' | ')} |`, ...body.map(line)].join('\n');
}

function inline(node) {
  if (node.tag === '#text') return node.text.replace(/\s+/g, ' ').replace(/</g, '&lt;');
  if (isHidden(node)) return '';
  const kids = () => (node.children || []).map(inline).join('');
  switch (node.tag) {
    case 'br': return '\n';
    case 'img': return null; // handled in blocks()
    case 'strong': case 'b': { const s = kids().trim(); return s ? `**${s}**` : ''; }
    case 'em': case 'i': { const s = kids().trim(); return s ? `*${s}*` : ''; }
    case 'code': { const s = kids(); return s ? `\`${s}\`` : ''; }
    case 'a': {
      const s = kids().trim();
      const href = (node.attrs.href || '').replace(/^http:/, 'https:');
      if (!s) return '';
      return href && !href.startsWith('javascript') ? `[${s}](${href})` : s;
    }
    case '#root': return kids();
    default: return kids();
  }
}

const HEADINGS = { h1: '#', h2: '##', h3: '###', h4: '####', h5: '#####', h6: '######' };

function nodeToBlock(node, ctx) {
  if (node.tag === '#text') return node.text.replace(/\s+/g, ' ');
  if (isHidden(node)) return '';
  const kids = () => blocks(node.children || [], ctx).join('\n\n');

  if (node.tag === 'img') {
    const src = node.attrs.src || node.attrs['data-src'] || '';
    const alt = (node.attrs.alt || '').trim() || ctx.figCaption();
    return src ? `![${alt}](${ctx.img(src, alt)})` : '';
  }
  if (HEADINGS[node.tag]) {
    const t = (node.children || []).map(inline).join('').replace(/\s+/g, ' ').trim();
    return t ? `${HEADINGS[node.tag]} ${t}` : '';
  }
  if (node.tag === 'table') return tableToMd(node);
  if (node.tag === 'hr') return '---';
  if (node.tag === 'ul' || node.tag === 'ol') {
    const items = (node.children || []).filter(c => c.tag === 'li');
    const lines = items.map((li, i) => {
      const body = blocks(li.children || [], ctx).join('\n\n').trim().replace(/\n{2,}/g, '\n');
      const marker = node.tag === 'ol' ? `${i + 1}. ` : '- ';
      const indented = body.split('\n').map((l, j) => (j === 0 ? marker + l : '  ' + l)).join('\n');
      return indented;
    });
    return lines.join('\n');
  }
  if (node.tag === 'blockquote') {
    const body = kids().trim();
    return body ? body.split('\n').map(l => (l.trim() ? `> ${l}` : '>')).join('\n') : '';
  }
  if (isCallout(node) && !ctx.inQuote) {
    const body = blocks(node.children || [], { ...ctx, inQuote: true }).join('\n\n').trim();
    if (!body) return '';
    return body.split('\n').map(l => (l.trim() ? `> ${l}` : '>')).join('\n');
  }
  if (node.tag === 'p' || node.tag === 'section' || node.tag === 'div' || node.tag === 'article') {
    const hasBlockChild = (node.children || []).some(c => ['section', 'div', 'p', 'ul', 'ol', 'table', 'img', 'h2', 'h3', 'h4', 'blockquote'].includes(c.tag));
    if (!hasBlockChild) {
      const s = (node.children || []).map(inline).join('').replace(/[ \t]+/g, ' ').trim();
      const h = pseudoHeading(node, s);
      return h || s;
    }
  }
  return kids();
}

function inlinePieces(node, ctx) {
  // 把「混合了行内元素与块级子节点」的容器拆开，保证顺序不乱
  const out = [];
  let buf = [];
  const flush = () => { if (buf.length) { out.push({ type: 'inline', html: buf.map(inline).join('') }); buf = []; } };
  for (const c of node.children || []) {
    if (['section', 'div', 'p', 'ul', 'ol', 'table', 'h2', 'h3', 'h4', 'blockquote', 'img'].includes(c.tag) || HEADINGS[c.tag]) {
      flush(); out.push({ type: 'node', node: c });
    } else buf.push(c);
  }
  flush();
  return out;
}

function blocks(nodes, ctx) {
  const out = [];
  for (const n of nodes) {
    if (n.tag === '#text') {
      const t = n.text.replace(/\s+/g, ' ').replace(/</g, '&lt;').trim();
      if (t) out.push(t);
      continue;
    }
    if (['section', 'div', 'article', '#root'].includes(n.tag) && !isCallout(n)) {
      for (const p of inlinePieces(n, ctx)) {
        if (p.type === 'inline') { const t = p.html.replace(/[ \t]+/g, ' ').trim(); if (t) out.push(t); }
        else { const s = nodeToBlock(p.node, ctx); if (s && s.trim()) out.push(s); }
      }
      continue;
    }
    const s = nodeToBlock(n, ctx);
    if (s && s.trim()) out.push(s);
  }
  return mergeCaptions(out);
}

// 把紧随图片的「【配图：xxx】」并入图片 alt，避免正文出现孤立的一行
function mergeCaptions(items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const cur = items[i].trim();
    const next = items[i + 1];
    const m = next && next.trim().match(/^【配图[:：]\s*(.+?)】$/);
    if (m && /^!\[[^\]]*\]\([^)]+\)$/.test(cur)) {
      out.push(cur.replace(/^!\[[^\]]*\]/, `![${m[1]}]`));
      i++;
      continue;
    }
    out.push(items[i]);
  }
  return out;
}

function tidy(md) {
  return md
    .replace(/\r/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/(^|\n)[ \t]+/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/^[•●]\s+/gm, '- ')
    .trim();
}

// 把作者贴成「一行一段」的 JSON-LD 代码还原成代码块
function fixCodeBlocks(md) {
  return md.replace(/(?:^>.*(?:\n|$))+/gm, (block) => {
    if (!block.includes('ld+json')) return block;
    const raw = block
      .split('\n')
      .map(l => l.replace(/^>\s?/, '').trim())
      .filter(Boolean)
      .join('\n')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    const m = raw.match(/^<script([^>]*)>([\s\S]*)<\/script>$/);
    if (!m) return block;
    let inner = m[2].trim();
    try { inner = JSON.stringify(JSON.parse(inner), null, 2); } catch { /* 保留原样 */ }
    return '```html\n<script' + m[1] + '>\n' + inner + '\n</script>\n```\n';
  });
}

/* ---------------- 图片下载 ---------------- */

const EXT_BY_TYPE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp' };

async function downloadImage(url, destDir, index, referer) {
  const clean = url.split('#')[0];
  const res = await fetch(clean, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Referer: referer || 'https://mp.weixin.qq.com/',
      Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${clean}`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  let ext = EXT_BY_TYPE[type];
  if (!ext) {
    const m = clean.match(/wx_fmt=([a-z]+)/) || clean.match(/\.([a-z]{2,4})(?:\?|$)/);
    ext = m ? m[1].replace('jpeg', 'jpg') : 'png';
  }
  const name = `${String(index).padStart(2, '0')}.${ext}`;
  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.writeFile(path.join(destDir, name), buf);
  return name;
}

/* ---------------- 主流程 ---------------- */

function parseDate(rec) {
  if (rec.ct) {
    const d = new Date(Number(rec.ct) * 1000);
    return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  }
  // 兜底：从「2026年11月18日 17:59」解析
  const m = String(rec.dateText || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  return new Date().toISOString().slice(0, 10);
}

function yamlTitle(t) {
  return t.replace(/^【[^】]*】/, '').trim();
}

const articleIndex = [];

for (const [i, slug] of SLUGS.entries()) {
  const file = path.join(RAW, `a${String(i + 1).padStart(2, '0')}.json`);
  const rec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const title = yamlTitle(rec.title);
  const date = parseDate(rec);
  const imgDir = path.join(ROOT, 'assets', 'images', slug);

  // 1) 先扫出所有图片，按出现顺序编号并下载
  const tree = parseHTML(rec.html);
  const imgUrls = [];
  (function collect(n) {
    if (n.tag === 'img') { const s = n.attrs.src || n.attrs['data-src']; if (s) imgUrls.push(s); }
    for (const c of n.children || []) collect(c);
  })(tree);

  const urlToLocal = new Map();
  let imgNo = 0;
  for (const u of imgUrls) {
    if (urlToLocal.has(u)) continue;
    imgNo++;
    // 已经下载过就跳过（保持编号稳定，便于重复构建）
    const existing = fs.existsSync(imgDir)
      ? fs.readdirSync(imgDir).find(f => f.startsWith(String(imgNo).padStart(2, '0') + '.'))
      : null;
    if (existing) {
      urlToLocal.set(u, `../assets/images/${slug}/${existing}`);
      continue;
    }
    try {
      const name = await downloadImage(u, imgDir, imgNo, rec.url);
      urlToLocal.set(u, `../assets/images/${slug}/${name}`);
      process.stdout.write(`  img ${slug}/${name}\n`);
    } catch (e) {
      console.log(`  ! img failed ${u.slice(0, 60)} :: ${e.message}`);
      imgNo--;
    }
  }

  // 2) Markdown
  let fig = 0;
  const ctx = {
    inQuote: false,
    figCaption: () => `图 ${++fig}`,
    img: (src) => {
      const local = urlToLocal.get(src);
      return local || src;
    },
  };
  const body = fixCodeBlocks(tidy(blocks(tree.children, ctx).join('\n\n')));

  const md = [
    `# ${title}`,
    '',
    `> 本文是《${SERIES}：如何让 AI 优先推荐你的品牌与产品》系列第 ${i + 1} 篇。`,
    `> 作者：${AUTHOR} · 首发：${date} · 原文：[微信公众号](${rec.url})`,
    '',
    body,
    '',
    '---',
    '',
    `← [返回目录](../README.md)`,
    '',
  ].join('\n');

  await fs.promises.mkdir(path.join(ROOT, 'articles'), { recursive: true });
  await fs.promises.writeFile(path.join(ROOT, 'articles', `${slug}.md`), md);

  // 3) 原样 HTML 快照（保留全部内联样式，只把图片换成相对路径）
  let html = rec.html.replace(/&amp;/g, '&');
  for (const [u, local] of urlToLocal) {
    const esc = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(esc, 'g'), local);
  }
  // 兜底：任何没下载成功的微信图，转成 https
  html = html.replace(/src="http:\/\/mmbiz\.qpic\.cn/g, 'src="https://mmbiz.qpic.cn');
  // 去掉仅公众号需要的属性
  html = html.replace(/\sdata-pm-slice="[^"]*"/g, '').replace(/\sleaf=""/g, '').replace(/\sdata-src="[^"]*"/g, '');
  const leftover = (html.match(/mmbiz\.qpic\.cn/g) || []).length;
  if (leftover) console.log(`  ! ${leftover} 处图片仍指向微信图床`);

  const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="author" content="${AUTHOR}">
<title>${title} · ${SERIES}</title>
<meta name="description" content="《${SERIES}》第 ${i + 1} 篇：${title}">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<main class="page">
  <nav class="crumb"><a href="../index.html">← 目录</a><span>第 ${i + 1} / ${SLUGS.length} 篇</span></nav>
  <header class="page-head">
    <h1>${title}</h1>
    <p class="meta">${AUTHOR} · ${date} · <a href="${rec.url}" target="_blank" rel="noopener">查看公众号原文</a></p>
  </header>
  <article class="rich">
${html}
  </article>
  <footer class="page-foot">
    <p>原文地址：<a href="${rec.url}" target="_blank" rel="noopener">${rec.url}</a></p>
    <p><a href="../articles/${slug}.md">Markdown 版本</a> · <a href="../index.html">返回目录</a></p>
  </footer>
</main>
</body>
</html>
`;

  await fs.promises.mkdir(path.join(ROOT, 'pages'), { recursive: true });
  await fs.promises.writeFile(path.join(ROOT, 'pages', `${slug}.html`), page);

  // 摘要：优先取「速读」里的第 1 条（有序或无序），其次取正文第一段
  const plain = body.replace(/[#>*!\[\]()\-`]/g, '').replace(/\s+/g, ' ').trim();
  const lines = body
    .split('\n')
    .map(l => l.replace(/^>\s?/, '').replace(/^[-•]\s+/, '').trim())
    .filter(Boolean);
  let summary = lines.find(l => /^\d+[.、]\s*\S/.test(l))
    || lines.find(l => l.length > 20 && !/^[#!|]/.test(l))
    || '';
  summary = summary.replace(/^(⏱️|📌|⚡)\s*/g, '').replace(/^\d+[.、]\s*/, '').replace(/[#>*`\[\]()]/g, '').trim();
  if (summary.length > 68) {
    const cut = summary.slice(0, 68);
    const p = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('？'));
    summary = p > 34
      ? cut.slice(0, p + 1)
      : cut.replace(/[A-Za-z0-9]+$/, '').replace(/[，、；：,.\s]+$/, '');
  }
  articleIndex.push({ n: i + 1, slug, title, date, url: rec.url, summary, chars: plain.length, imgCount: urlToLocal.size });
  console.log(`✔ ${String(i + 1).padStart(2, '0')} ${title} (${plain.length} 字, ${urlToLocal.size} 图)`);
}

fs.writeFileSync(path.join(ROOT, 'build.index.json'), JSON.stringify(articleIndex, null, 2));
console.log('\n完成：articles/ pages/ assets/images/');
