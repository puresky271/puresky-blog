/** 舞台插画。图片在构建期经 astro:assets 优化，这里只拿最终地址。 */
export interface StageImage {
  id: string;
  title: string;
  alt: string;
  src: string;
  /** 夜晚版本。夜里（data-phase=night）显示这一张。 */
  srcNight: string | null;
  width: number;
  height: number;
}

export type StageMode = 'art' | 'sky' | 'music';
