/**
 * http.mjs — 编辑器接口的请求校验与收发。
 *
 * 安全边界（这个接口能写文件、能执行 git，必须只对本机开放）：
 *   1. 只接受来自回环地址的连接：dev server 即使用 --host 暴露到局域网，别的机器也用不了；
 *   2. Host 头必须是 localhost / 127.0.0.1 / [::1]：挡 DNS rebinding（恶意域名解析到 127.0.0.1）；
 *   3. 有 Origin 头时必须是本机来源，且每个请求都要带自定义头 x-puresky-editor：
 *      别的网站的页面即使在你的浏览器里，也没法跨站调这个接口（自定义头会触发预检，而这里从不放行）。
 */

export const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const MAX_BODY = 16 * 1024 * 1024;

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string} [code] 给前端区分错误种类用，例如 conflict（磁盘上的文件被别处改过）。
   */
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isLoopback(req) {
  return LOOPBACK.has(req.socket.remoteAddress ?? '');
}

function guardLocal(req) {
  if (!isLoopback(req)) throw new HttpError(403, '编辑器只对本机开放');
  const host = String(req.headers.host ?? '').replace(/:\d+$/, '');
  if (!LOCAL_HOSTS.has(host)) throw new HttpError(403, '编辑器只能通过 localhost 访问');
  const origin = req.headers.origin;
  if (origin) {
    let hostname = '';
    try {
      hostname = new URL(origin).hostname;
    } catch {
      // 解析不了的 Origin 一律拒绝。
    }
    if (!LOCAL_HOSTS.has(hostname) && hostname !== '[::1]') throw new HttpError(403, '拒绝跨站请求');
  }
}

export function guard(req) {
  guardLocal(req);
  if (req.headers['x-puresky-editor'] !== '1') throw new HttpError(403, '缺少编辑器请求头');
}

/** 图片由 <img> 请求，不能带自定义头；仍校验回环连接、Host 和 Origin。 */
export function guardAsset(req) {
  guardLocal(req);
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, '内容太大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function json(req) {
  const raw = await readBody(req);
  try {
    return JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, '请求体不是合法 JSON');
  }
}

export function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}
