/**
 * deploy.mjs — 把本机构建好的 dist/ 上传到 Cloudflare（只有静态资源的 Worker，配置见 ../wrangler.jsonc）。
 *
 *   npm run deploy            构建 + 搜索索引 + 上传
 *
 * 为什么从本机部署而不是让 CI 从仓库构建：首页和关于页的插画放在 src/assets/local/（gitignore，
 * 不进公开仓库），只有本机构建时才有。直接上传 dist，图片随站点一起上线，但永远不进 git。
 *
 * 需要先登录一次：cd ../worker && npx wrangler login
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('..', import.meta.url));
const wrangler = fileURLToPath(new URL('../../worker/node_modules/wrangler/bin/wrangler.js', import.meta.url));
const config = path.join(site, 'wrangler.jsonc');

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

// wrangler 在没有配置文件的 Astro 项目目录里会尝试「自动配置」：往 package.json 里装 @astrojs/cloudflare 和 wrangler。
// 这里始终显式传配置文件，并从系统临时目录调用，避免它碰项目文件。
const result = spawnSync(process.execPath, [wrangler, 'deploy', '--config', config], { cwd: tmpdir(), stdio: 'inherit' });
process.exit(result.status ?? 1);
