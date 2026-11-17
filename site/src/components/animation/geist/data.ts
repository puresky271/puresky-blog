/**
 * Geist 演示的数据层。
 *
 * 通用实现已经收进 @/lib/snapshot，这里只保留 Geist 这一套的默认参数，
 * 免得各处散落 '/data/geist' 和 '/media/geist/' 这类路径。
 */

import {
  fixSnapshotMedia,
  loadSnapshotJson,
  type SnapshotGroupData,
} from '@/lib/snapshot';

export type { SnapshotGroupData };

/** 读 public/data/geist 下的分组 JSON，同一次会话只请求一次。 */
export function loadGeistJson<T = SnapshotGroupData>(path: string): Promise<T> {
  return loadSnapshotJson<T>(path);
}

/** 快照里的图片在 /media/geist/ 下，部署到子路径时要补 base。 */
export function fixGeistMedia(root: ParentNode): void {
  fixSnapshotMedia(root, '/media/geist/');
}
