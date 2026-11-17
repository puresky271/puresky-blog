/**
 * 可交互复刻的注册表。
 *
 * 静态示例由 GeistGallery 直接渲染原站快照，这一份登记的是站内手写的可交互版本：
 * 点得动、能展开、能打字的那几个组件，按 slug 对到组件文件。
 * GeistGallery 发现当前组件在表里时，会在静态示例下面多挂一张「可交互版本」卡片。
 */

import type { Component } from 'svelte';

export interface GeistInteractiveProps {
  config: Record<string, unknown>;
}

/** key 是组件 slug（和 public/data/geist/*.json 里的 slug 一致）。 */
export const INTERACTIVE: Record<string, () => Promise<Component<GeistInteractiveProps>>> = {
  button: async () => (await import('./ButtonDemo.svelte')).default,
  'copy-button': async () => (await import('./CopyButtonDemo.svelte')).default,
  'split-button': async () => (await import('./SplitButtonDemo.svelte')).default,
  tabs: async () => (await import('./TabsDemo.svelte')).default,
  modal: async () => (await import('./ModalDemo.svelte')).default,
  toast: async () => (await import('./ToastDemo.svelte')).default,
  tooltip: async () => (await import('./TooltipDemo.svelte')).default,
  menu: async () => (await import('./MenuDemo.svelte')).default,
  select: async () => (await import('./SelectDemo.svelte')).default,
  switch: async () => (await import('./SwitchDemo.svelte')).default,
  checkbox: async () => (await import('./CheckboxDemo.svelte')).default,
  radio: async () => (await import('./RadioDemo.svelte')).default,
  slider: async () => (await import('./SliderDemo.svelte')).default,
  collapse: async () => (await import('./CollapseDemo.svelte')).default,
  pagination: async () => (await import('./PaginationDemo.svelte')).default,
  calendar: async () => (await import('./CalendarDemo.svelte')).default,
};
