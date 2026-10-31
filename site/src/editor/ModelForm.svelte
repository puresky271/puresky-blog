<script lang="ts">
  /**
   * ModelForm.svelte — 榜单工作台中间的模型表单，直接改传进来的那一条模型。
   *
   * 不自己保存：所有字段都改在 Leaderboard.svelte 的 $state 副本上，预览和「保存榜单」按钮都看那份副本。
   * id 是价格匹配和页面深链的键，加进榜单后不给改。标签只能从 config.ts 的 TAGS 里选。
   */
  import Icon from '@/components/ui/Icon.svelte';
  import { TAG_GROUPS, TAGS, type TagName } from '@/config';
  import { SCORE_KEYS, SCORE_LABELS, TIERS, todayISO } from '@/lib/leaderboard';
  import type { LeaderboardModel, ModelStatus, ScoreKey } from '@/lib/leaderboard';
  import { iArrowCounterClockwise } from '@/lib/icons.generated';

  let { model }: { model: LeaderboardModel } = $props();

  const tagGroups = $derived(TAG_GROUPS.map((group) => ({ ...group, items: TAGS.filter((tag) => tag.group === group.id) })));

  function hasTag(name: TagName) {
    return model.tags.includes(name);
  }

  function toggleTag(name: TagName) {
    model.tags = hasTag(name) ? model.tags.filter((tag) => tag !== name) : [...model.tags, name];
  }

  function setStatus(status: ModelStatus) {
    model.status = status;
    if (status === 'retired') model.retiredAt = model.retiredAt || todayISO();
    else delete model.retiredAt;
  }

  function scoreText(key: ScoreKey) {
    return model.subscores[key] ?? '';
  }

  function setScore(key: ScoreKey, raw: string) {
    if (raw.trim() === '') {
      delete model.subscores[key];
      return;
    }
    const value = Number(raw);
    if (Number.isFinite(value)) model.subscores[key] = Math.max(0, Math.min(100, Math.round(value)));
  }

  /** 可选日期：清空输入框时 value 是空字符串，写回 undefined，别把空串写进 json。 */
  function setOptionalDate(field: 'releasedAt' | 'retiredAt', raw: string) {
    if (raw) model[field] = raw;
    else delete model[field];
  }

  /** 可选的短文本：清空时同样写回 undefined。 */
  function setOptionalText(field: 'icon' | 'link' | 'useCase', raw: string) {
    const value = raw.trim();
    if (value) model[field] = value;
    else delete model[field];
  }
</script>

<div class="lb-form">
  <div class="lb-form-head">
    <div class="lb-form-title">
      <h2>{model.name || '未命名模型'}</h2>
      {#if model.status === 'active'}
        <span class="ed-badge ok">在榜</span>
      {:else}
        <span class="ed-badge muted">已下榜</span>
      {/if}
    </div>
    {#if model.status === 'active'}
      <button type="button" class="ed-btn sm quiet" onclick={() => setStatus('retired')}>标记下榜</button>
    {:else}
      <button type="button" class="ed-btn sm" onclick={() => setStatus('active')}><Icon icon={iArrowCounterClockwise} size={13} />重新上架</button>
    {/if}
  </div>

  <p class="lb-hint">id：<span class="font-mono">{model.id}</span>。id 是价格匹配和页面锚点的键，加入榜单后不改。</p>

  <div class="lb-grid2">
    <label class="lb-field">
      <span class="ed-label">名称</span>
      <input class="ed-input" bind:value={model.name} />
    </label>
    <label class="lb-field">
      <span class="ed-label">厂商</span>
      <input class="ed-input" bind:value={model.vendor} />
    </label>
    <label class="lb-field">
      <span class="ed-label">档位</span>
      <select class="ed-input" bind:value={model.tier}>
        {#each TIERS as tier}<option value={tier.id}>{tier.name}</option>{/each}
      </select>
    </label>
    <label class="lb-field">
      <span class="ed-label">档内顺序</span>
      <input class="ed-input" type="number" bind:value={model.order} />
    </label>
    <label class="lb-field">
      <span class="ed-label">入榜日期</span>
      <input class="ed-input" type="date" bind:value={model.addedAt} />
    </label>
    <label class="lb-field">
      <span class="ed-label">发布日期</span>
      <input class="ed-input" type="date" value={model.releasedAt ?? ''} oninput={(event) => setOptionalDate('releasedAt', (event.currentTarget as HTMLInputElement).value)} />
    </label>
    {#if model.status === 'retired'}
      <label class="lb-field">
        <span class="ed-label">下榜日期</span>
        <input class="ed-input" type="date" value={model.retiredAt ?? ''} oninput={(event) => setOptionalDate('retiredAt', (event.currentTarget as HTMLInputElement).value)} />
      </label>
    {/if}
    <label class="lb-field">
      <span class="ed-label">图标路径（可选）</span>
      <input class="ed-input mono" value={model.icon ?? ''} oninput={(event) => setOptionalText('icon', (event.currentTarget as HTMLInputElement).value)} placeholder="/models/icons/xxx.svg" spellcheck="false" />
    </label>
  </div>

  <label class="lb-field">
    <span class="ed-label">链接（可选）</span>
    <input class="ed-input mono" value={model.link ?? ''} oninput={(event) => setOptionalText('link', (event.currentTarget as HTMLInputElement).value)} placeholder="https://openrouter.ai/…" spellcheck="false" />
  </label>

  <section class="lb-block">
    <h3 class="lb-block-title">标签 <span class="lb-count">{model.tags.length}</span></h3>
    <p class="ed-hint">只能选 config.ts 里登记过的标签，模型印象在最后一组。</p>
    {#each tagGroups as group}
      <div class="lb-tag-group">
        <p class="lb-tag-group-name">{group.label}</p>
        <div class="lb-tags">
          {#each group.items as tag}
            <button type="button" class="lb-tag" class:active={hasTag(tag.name)} aria-pressed={hasTag(tag.name)} onclick={() => toggleTag(tag.name)} title={tag.blurb}>
              #{tag.name}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </section>

  <section class="lb-block">
    <h3 class="lb-block-title">分项评分</h3>
    <div class="lb-scores">
      {#each SCORE_KEYS as key}
        <label class="lb-score">
          <span class="ed-label">{SCORE_LABELS[key]}</span>
          <input
            class="ed-input"
            type="number"
            min="0"
            max="100"
            value={scoreText(key)}
            oninput={(event) => setScore(key, (event.currentTarget as HTMLInputElement).value)}
          />
        </label>
      {/each}
    </div>
    <p class="ed-hint">0 到 100，留空表示这一项不评。</p>
  </section>

  <label class="lb-field">
    <span class="ed-label">一句话结论</span>
    <textarea class="ed-input" rows="2" bind:value={model.blurb} placeholder="卡片和抽屉头部显示这一句"></textarea>
  </label>

  <label class="lb-field">
    <span class="ed-label">点评</span>
    <textarea class="ed-input" rows="9" bind:value={model.review} placeholder="纯文本，空行分段。会显示在模型抽屉的正文区"></textarea>
  </label>

  <label class="lb-field">
    <span class="ed-label">适合谁（可选）</span>
    <textarea
      class="ed-input"
      rows="2"
      value={model.useCase ?? ''}
      oninput={(event) => setOptionalText('useCase', (event.currentTarget as HTMLTextAreaElement).value)}
      placeholder="适合：… 不适合：…"
    ></textarea>
  </label>
</div>
