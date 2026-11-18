# 企业GEO实战指南：如何让 AI 优先推荐你的品牌与产品

> 作者：**何承泽** ｜ 共 11 讲 · 约 4.4 万字 ｜ 许可：CC BY-NC-SA 4.0

一套写给中小企业的 GEO（Generative Engine Optimization，生成式引擎优化）实战教程。
不堆术语，只讲三件事：**AI 凭什么推荐你、内容该怎么写、钱少怎么落地。**

## 这是什么

传统 SEO 让 AI「能找到你」，GEO 让 AI「愿意推荐你」。这套教程把两者拆开讲清楚，
再给出一套可以直接照做的内容改造流程（含 3 套 Prompt 模板）。

## 目录

| # | 标题 | 网页版（保留原排版） | 首发 |
|---|---|---|---|
| 01 | [SEO与GEO不是取代关系，而是“基建”与“决胜”](articles/01-seo-vs-geo.md) | [网页版](pages/01-seo-vs-geo.html) | 2026-11-01 |
| 02 | [AI 是怎么推荐你的？一文说明白AI 搜索的评分机制](articles/02-how-ai-ranks-you.md) | [网页版](pages/02-how-ai-ranks-you.html) | 2026-11-03 |
| 03 | [豆包、千问、元宝、DeepSeek收录偏好大起底](articles/03-ai-platform-indexing.md) | [网页版](pages/03-ai-platform-indexing.html) | 2026-11-06 |
| 04 | [分清品牌曝光与商品成交逻辑，布局AI平台生态](articles/04-brand-vs-conversion.md) | [网页版](pages/04-brand-vs-conversion.html) | 2026-11-08 |
| 05 | [GEO 内容创作与优化七步法（附 3 套专用 Prompt 模板）](articles/05-content-playbook.md) | [网页版](pages/05-content-playbook.html) | 2026-11-09 |
| 06 | [AI 搜索怎么找提问词句？教你 3 招挖掘高转化率的“关键句”](articles/06-query-mining.md) | [网页版](pages/06-query-mining.html) | 2026-11-10 |
| 07 | [七步把企业官网改造成 AI 最爱的“标准数据源”](articles/07-website-as-datasource.md) | [网页版](pages/07-website-as-datasource.html) | 2026-11-11 |
| 08 | [防御企业信息被AI投毒及相关处理流程](articles/08-defend-ai-poisoning.md) | [网页版](pages/08-defend-ai-poisoning.html) | 2026-11-15 |
| 09 | [B2B制造与工业品企业如何通过 GEO提高获客能力](articles/09-b2b-manufacturing.md) | [网页版](pages/09-b2b-manufacturing.html) | 2026-11-16 |
| 10 | [本地生活类实体店如何让顾客在问AI时推荐你](articles/10-local-business.md) | [网页版](pages/10-local-business.html) | 2026-11-17 |
| 11 | [GEO 效果自检与全网监测方法（附监测模板）](articles/11-monitoring-selfcheck.md) | [网页版](pages/11-monitoring-selfcheck.html) | 2026-11-18 |

## 怎么读

- **在线阅读**：访问 GitHub Pages 站点（见下方「发布到 GitHub Pages」），或在本地打开 `index.html`。
  注意：在 github.com 网页上直接点 `index.html` / `pages/*.html` 只会显示源码，不会渲染。
- **纯文本 / 喂给 AI**：`articles/*.md` 是完整正文，图片已本地化，可直接复制、检索、RAG，GitHub 上也能直接预览。
- **看原排版**：`pages/*.html` 是从公众号保存的静态快照，样式、配图位置与原页面一致（通过 Pages 或本地打开查看）。
- **给 AI 爬虫的入口**：仓库根目录的 `llms.txt` 列出了全部文章，方便模型抓取引用。

## 本地预览

不需要构建工具，双击 `index.html` 即可。或者起个静态服务：

```bash
python -m http.server 8000
# 然后打开 http://localhost:8000
```

## 目录结构

```
.
├── index.html            目录页
├── articles/             正文 Markdown（11 篇）
├── pages/                原排版 HTML 快照（11 篇）
├── assets/
│   ├── style.css         站点样式
│   └── images/           全部配图（本地化，不依赖微信图床）
├── scripts/              抓取结果 → Markdown/HTML 的转换脚本
├── llms.txt              面向 AI 的站点索引
└── raw/                  原始抓取数据（不入库）
```

## 发布到 GitHub Pages

目标：仓库 `https://github.com/zshmbbs/geo-guide`，站点 `https://zshmbbs.github.io/geo-guide/`。

### 方式一：网页上传（不用装任何工具，最快）

1. GitHub 右上角 **+ → New repository**，名字填 `geo-guide`，选 **Public**，点 Create
2. 进入仓库，点 **uploading an existing file**，把 `index.html`、`articles/`、`pages/`、`assets/`、`README.md`、`LICENSE`、`llms.txt`、`.nojekyll`、`scripts/` 拖进去（`raw/` 不用传，体积大且是中间数据）
3. **Commit changes**
4. 仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，Branch 选 **main** + **/ (root)**，Save
5. 等 1 分钟，访问 `https://zshmbbs.github.io/geo-guide/`

### 方式二：命令行（推荐，后续更新只用一条命令）

```bash
cd geo-guide
git init
git add .
git commit -m "docs: 《企业GEO实战指南》全 10 讲"
git branch -M main
git remote add origin https://github.com/zshmbbs/geo-guide.git
git push -u origin main
```

### 方式三：GitHub Desktop

把整个 `geo-guide` 文件夹拖进 GitHub Desktop，点 **Publish repository** 即可。

> ⚠️ 根目录的 `.nojekyll` 不要删：它让 Pages 直接发布静态文件，不跑 Jekyll，中文文件名和 `pages/` 才不会出问题。

## 更新内容

重新抓取一篇文章后，把它存成 `raw/aNN.json`（字段：`index/title/author/dateText/ct/html/url`），然后：

```bash
node scripts/build.mjs   # 重新生成 Markdown + 快照 + 图片
node scripts/site.mjs    # 重新生成首页 / README / llms.txt
```

## 版权与转载

内容版权归作者所有，采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) 许可：

- ✅ 可自由阅读、转载、改编、用于教学
- ✅ 需**署名**并注明出处
- ✅ 改编后的作品需以**相同许可**共享
- ❌ **不得用于商业用途**（如需商用请先联系作者）

转换脚本（`scripts/`）采用 MIT 许可。

## 原文

连载于微信公众号，专栏目录：[企业GEO实战指南](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MjM5NzU2MDI0Mg==&action=getalbum&album_id=4766401206393241601)
