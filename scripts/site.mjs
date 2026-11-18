/**
 * site.mjs —— 由 build.index.json 生成 index.html / README.md / llms.txt
 * 运行：node scripts/site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'build.index.json'), 'utf8'));

const SERIES = '企业GEO实战指南';
const SUBTITLE = '如何让 AI 优先推荐你的品牌与产品';
const AUTHOR = '何承泽';
const REPO = 'https://github.com/zshmbbs/geo-guide';
const ALBUM = 'https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MjM5NzU2MDI0Mg==&action=getalbum&album_id=4766401206393241601';
const totalChars = idx.reduce((s, a) => s + a.chars, 0);
const totalImgs = idx.reduce((s, a) => s + a.imgCount, 0);

/* ---------------- index.html ---------------- */

const cards = idx.map(a => `
      <li>
        <a class="item" href="pages/${a.slug}.html">
          <span class="no">${String(a.n).padStart(2, '0')}</span>
          <span class="t">${a.title}</span>
          <p class="d">${a.summary}${/[。！？]$/.test(a.summary) ? '' : '…'}</p>
        </a>
        <p class="links">
          <a href="pages/${a.slug}.html">网页版（保留原排版）</a>
          <a href="articles/${a.slug}.md">Markdown</a>
          <a href="${a.url}" target="_blank" rel="noopener">公众号原文</a>
        </p>
      </li>`).join('');

const indexHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${SERIES}：${SUBTITLE}</title>
<meta name="description" content="《${SERIES}》完整 ${idx.length} 讲，讲清 GEO 是什么、AI 如何挑选内容、以及中小企业如何低成本落地。作者：${AUTHOR}。">
<meta name="author" content="${AUTHOR}">
<meta property="og:title" content="${SERIES}：${SUBTITLE}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<main class="page">
  <header class="hero">
    <h1>${SERIES}<br>${SUBTITLE}</h1>
    <p class="sub">用大白话讲清 GEO：AI 为什么推荐别人而不推荐你，以及怎么改。</p>
    <ul class="facts">
      <li><b>${idx.length}</b> 讲</li>
      <li><b>${(totalChars / 10000).toFixed(1)}</b> 万字</li>
      <li><b>${totalImgs}</b> 张配图</li>
      <li>作者 <b>${AUTHOR}</b></li>
      <li>许可 <b>CC BY-NC-SA 4.0</b></li>
    </ul>
  </header>

  <div class="lede">
    <p>这套教程想解决一个很具体的问题：企业花钱做了内容，AI 搜索却从来不提你。</p>
    <p>全系列从认知纠偏讲到平台偏好、内容七步法、官网改造与行业落地，每讲都可以单独读，也建议按顺序读。</p>
  </div>

  <ol class="toc">${cards}
  </ol>

  <footer class="site-foot">
    <p>原文连载于微信公众号 · <a href="${ALBUM}" target="_blank" rel="noopener">专栏目录</a></p>
    <p>本站为作者授权的免费在线阅读版，内容采用 CC BY-NC-SA 4.0 许可：可自由转载、改编，请署名并保持相同方式共享，不得用于商业用途。</p>
  </footer>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml);

/* ---------------- README.md ---------------- */

const rows = idx.map(a =>
  `| ${String(a.n).padStart(2, '0')} | [${a.title}](articles/${a.slug}.md) | [网页版](pages/${a.slug}.html) | ${a.date} |`
).join('\n');

const readme = `# ${SERIES}：${SUBTITLE}

> 作者：**${AUTHOR}** ｜ 共 ${idx.length} 讲 · 约 ${(totalChars / 10000).toFixed(1)} 万字 ｜ 许可：CC BY-NC-SA 4.0

一套写给中小企业的 GEO（Generative Engine Optimization，生成式引擎优化）实战教程。
不堆术语，只讲三件事：**AI 凭什么推荐你、内容该怎么写、钱少怎么落地。**

## 这是什么

传统 SEO 让 AI「能找到你」，GEO 让 AI「愿意推荐你」。这套教程把两者拆开讲清楚，
再给出一套可以直接照做的内容改造流程（含 3 套 Prompt 模板）。

## 目录

| # | 标题 | 网页版（保留原排版） | 首发 |
|---|---|---|---|
${rows}

## 怎么读

- **在线阅读**：访问 GitHub Pages 站点（见下方「发布到 GitHub Pages」），或在本地打开 \`index.html\`。
  注意：在 github.com 网页上直接点 \`index.html\` / \`pages/*.html\` 只会显示源码，不会渲染。
- **纯文本 / 喂给 AI**：\`articles/*.md\` 是完整正文，图片已本地化，可直接复制、检索、RAG，GitHub 上也能直接预览。
- **看原排版**：\`pages/*.html\` 是从公众号保存的静态快照，样式、配图位置与原页面一致（通过 Pages 或本地打开查看）。
- **给 AI 爬虫的入口**：仓库根目录的 \`llms.txt\` 列出了全部文章，方便模型抓取引用。

## 本地预览

不需要构建工具，双击 \`index.html\` 即可。或者起个静态服务：

\`\`\`bash
python -m http.server 8000
# 然后打开 http://localhost:8000
\`\`\`

## 目录结构

\`\`\`
.
├── index.html            目录页
├── articles/             正文 Markdown（${idx.length} 篇）
├── pages/                原排版 HTML 快照（${idx.length} 篇）
├── assets/
│   ├── style.css         站点样式
│   └── images/           全部配图（本地化，不依赖微信图床）
├── scripts/              抓取结果 → Markdown/HTML 的转换脚本
├── llms.txt              面向 AI 的站点索引
└── raw/                  原始抓取数据（不入库）
\`\`\`

## 发布到 GitHub Pages

目标：仓库 \`${REPO}\`，站点 \`https://zshmbbs.github.io/geo-guide/\`。

### 方式一：网页上传（不用装任何工具，最快）

1. GitHub 右上角 **+ → New repository**，名字填 \`geo-guide\`，选 **Public**，点 Create
2. 进入仓库，点 **uploading an existing file**，把 \`index.html\`、\`articles/\`、\`pages/\`、\`assets/\`、\`README.md\`、\`LICENSE\`、\`llms.txt\`、\`.nojekyll\`、\`scripts/\` 拖进去（\`raw/\` 不用传，体积大且是中间数据）
3. **Commit changes**
4. 仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 **main** + **/ (root)**，Save
5. 等 1 分钟，访问 \`https://zshmbbs.github.io/geo-guide/\`

### 方式二：命令行（推荐，后续更新只用一条命令）

\`\`\`bash
cd geo-guide
git init
git add .
git commit -m "docs: 《企业GEO实战指南》全 10 讲"
git branch -M main
git remote add origin https://github.com/zshmbbs/geo-guide.git
git push -u origin main
\`\`\`

### 方式三：GitHub Desktop

把整个 \`geo-guide\` 文件夹拖进 GitHub Desktop，点 **Publish repository** 即可。

> ⚠️ 根目录的 \`.nojekyll\` 不要删：它让 Pages 直接发布静态文件，不跑 Jekyll，中文文件名和 \`pages/\` 才不会出问题。

## 更新内容

重新抓取一篇文章后，把它存成 \`raw/aNN.json\`（字段：\`index/title/author/dateText/ct/html/url\`），然后：

\`\`\`bash
node scripts/build.mjs   # 重新生成 Markdown + 快照 + 图片
node scripts/site.mjs    # 重新生成首页 / README / llms.txt
\`\`\`

## 版权与转载

内容版权归作者所有，采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) 许可：

- ✅ 可自由阅读、转载、改编、用于教学
- ✅ 需**署名**并注明出处
- ✅ 改编后的作品需以**相同许可**共享
- ❌ **不得用于商业用途**（如需商用请先联系作者）

转换脚本（\`scripts/\`）采用 MIT 许可。

## 原文

连载于微信公众号，专栏目录：[${SERIES}](${ALBUM})
`;

fs.writeFileSync(path.join(ROOT, 'README.md'), readme);

/* ---------------- llms.txt ---------------- */

const llms = `# ${SERIES}：${SUBTITLE}

> 一套面向中小企业的 GEO（生成式引擎优化）实战教程，共 ${idx.length} 讲，作者 ${AUTHOR}。
> 讲清 AI 搜索如何挑选与推荐内容、企业内容该如何改造、以及 B2B 与本地生活行业的落地方法。
> 内容采用 CC BY-NC-SA 4.0 许可，可自由阅读与引用，请署名并注明来源。

## 文章

${idx.map(a => `- [${a.title}](articles/${a.slug}.md)：${a.summary}`).join('\n')}

## 关于

- [GitHub 仓库](${REPO})：正文 Markdown、原排版快照与配图
- 原文专栏：${ALBUM}
- 作者：${AUTHOR}
`;

fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);
console.log('✔ index.html / README.md / llms.txt 已生成');
