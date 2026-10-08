/**
 * deploy-pages.mjs — 把本机构建好的 dist/ 直接上传到 Cloudflare Pages。
 *
 *   npm run deploy            构建 + 搜索索引 + 上传
 *   PAGES_PROJECT=xxx npm run deploy   换 Pages 项目名（默认 puresky-blog）
 *
 * 为什么从本机部署而不是让 CI 从仓库构建：首页和关于页的插画放在 src/assets/local/（gitignore，
 * 不进公开仓库），只有本机构建时才有。直接上传 dist，图片随站点一起上线，但永远不进 git。
 *
 * 需要先登录一次：cd ../worker && npx wrangler login
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const wrangler = fileURLToPath(new URL('../../worker/node_modules/wrangler/bin/wrangler.js', import.meta.url));
const project = process.env.PAGES_PROJECT || 'puresky-blog';

if (!existsSync(wrangler)) {
  console.error('找不到 wrangler：先在 worker/ 里运行一次 npm install。');
  process.exit(1);
}
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  console.error('dist/ 不存在：先运行 npm run build。');
  process.exit(1);
}
for (const name of ['home', 'about']) {
  const found = ['png', 'jpg', 'jpeg', 'webp', 'avif'].some((ext) => existsSync(new URL(`../src/assets/local/${name}.${ext}`, import.meta.url)));
  if (!found) console.warn(`提示：src/assets/local/ 里没有 ${name} 插画，这次部署会用仓库里的默认插画。`);
}

const result = spawnSync(
  process.execPath,
  [wrangler, 'pages', 'deploy', 'dist', '--project-name', project, '--branch', 'main', '--commit-dirty=true'],
  { cwd: site, stdio: 'inherit' }
);
process.exit(result.status ?? 1);
