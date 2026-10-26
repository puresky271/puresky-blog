/**
 * Windows 上 Astro 的内容缓存通过“先写 .tmp，再 rename 覆盖 data-store.json”提交。
 * 如果目标文件正被文件监听器或杀毒软件短暂占用，rename 会返回 EPERM。
 * 这里只对 Windows 的临时锁做有限次退避重试，不改变文件内容和调用方逻辑。
 */
import { promises as fs } from 'node:fs';

if (process.platform === 'win32') {
  const originalRename = fs.rename;

  fs.rename = async function renameWithRetry(from, to) {
    let wait = 50;

    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        return await originalRename.call(fs, from, to);
      } catch (error) {
        const code = error?.code;
        const retryable = code === 'EPERM' || code === 'EACCES' || code === 'EBUSY';
        if (!retryable || attempt === 11) throw error;
        await new Promise((resolve) => setTimeout(resolve, wait));
        wait = Math.min(wait * 2, 1200);
      }
    }
  };
}
