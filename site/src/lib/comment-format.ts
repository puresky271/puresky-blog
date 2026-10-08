/**
 * comment-format.ts — 评论正文渲染。
 *
 * 只支持三样：段落与换行、`行内代码`、裸链接。先整体转义 HTML 再做替换，
 * 所以评论里不可能注入任何标签。链接带 nofollow ugc，不给垃圾评论送权重。
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text: string): string {
  // 先把行内代码抠出来，避免代码里的网址被转成链接。
  const codes: string[] = [];
  let html = escapeHtml(text).replace(/`([^`\n]{1,200})`/g, (_, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  html = html.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"，。；：！？）]/g, (url) => {
    const label = url.length > 60 ? `${url.slice(0, 57)}…` : url;
    return `<a href="${url}" target="_blank" rel="nofollow ugc noopener noreferrer">${label}</a>`;
  });
  return html.replace(/\u0000(\d+)\u0000/g, (_, i: string) => `<code>${codes[Number(i)]}</code>`);
}

export function renderComment(body: string): string {
  return body
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${inline(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
