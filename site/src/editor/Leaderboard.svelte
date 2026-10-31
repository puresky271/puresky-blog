<script lang="ts">
  /**
   * Leaderboard.svelte — 编辑器第四个模式「榜单」的工作台。
   *
   * 左边：候选池 + 五个档位的列表（可拖拽换档、档内排序，按钮和下拉做键盘兜底）+ 已下榜区块。
   * 中间：选中模型的所有字段，直接改本地 $state 副本。
   * 右边：直接挂站点上的 TierBoard 组件做实时预览，改一个字段预览立刻跟着变。
   *
   * 保存走 POST /leaderboard，写回 site/src/data/leaderboard.json（2 空格缩进、末尾换行，交给后端校验）。
   * 榜单模式下的 Ctrl+S 由 Editor.svelte 转到这里（见 store.saveLeaderboard），不会顺手保存文章。
   */
  import { onMount } from 'svelte';

  import TierBoard from '@/components/leaderboard/TierBoard.svelte';
  import Icon from '@/components/ui/Icon.svelte';
  import { emptyModel, resolveModels, TIERS, todayISO } from '@/lib/leaderboard';
  import type { CatalogEntry, CatalogSnapshot, LeaderboardFile, LeaderboardModel, RankedModel, TierId } from '@/lib/leaderboard';
  import { iArrowClockwise, iCaretDown, iCaretUp, iDotsSixVertical, iFloppyDisk } from '@/lib/icons.generated';

  import { api } from './client';
  import CandidatePool from './CandidatePool.svelte';
  import ModelForm from './ModelForm.svelte';
  import { ed } from './store.svelte';

  const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

  let file = $state<LeaderboardFile | null>(null);
  let catalog = $state<CatalogSnapshot | null>(null);
  /** 载入或上次保存时的文件快照，用来判断有没有未保存的改动。 */
  let savedSnapshot = $state('');
  let loading = $state(true);
  let error = $state<string | null>(null);
  let saving = $state(false);
  let savedAt = $state<number | null>(null);
  let selectedId = $state<string | null>(null);

  let candidates = $state<CatalogEntry[]>([]);
  let candidatesFetchedAt = $state<string | null>(null);
  let candidatesLoading = $state(false);
  let candidatesWarning = $state<string | null>(null);

  let dragId = $state<string | null>(null);
  let overTier = $state<TierId | null>(null);
  let overId = $state<string | null>(null);

  const dirty = $derived(file ? JSON.stringify(file) !== savedSnapshot : false);
  const items = $derived(file ? resolveModels(file.models, catalog?.models ?? null) : ([] as RankedModel[]));
  const groups = $derived(TIERS.map((tier) => ({ tier, items: activeList(tier.id) })));
  const retired = $derived(
    file
      ? file.models
          .filter((model) => model.status === 'retired')
          .sort((a, b) => (b.retiredAt ?? '').localeCompare(a.retiredAt ?? '') || a.name.localeCompare(b.name, 'zh-CN'))
      : ([] as LeaderboardModel[])
  );
  const selected = $derived(file?.models.find((model) => model.id === selectedId) ?? null);

  $effect(() => {
    ed.leaderboardDirty = dirty;
    return () => {
      ed.leaderboardDirty = false;
    };
  });

  onMount(() => {
    ed.saveLeaderboard = save;
    void load();
    void loadCandidates(false);
    return () => {
      ed.saveLeaderboard = null;
    };
  });

  function snapshotOf(value: LeaderboardFile) {
    return JSON.stringify(value);
  }

  /** 某一档在榜的模型，按 order 升序。 */
  function activeList(tier: TierId) {
    if (!file) return [];
    return file.models
      .filter((model) => model.status === 'active' && model.tier === tier)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN'));
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const data = await api.leaderboard();
      file = data.file;
      catalog = data.catalog;
      savedSnapshot = snapshotOf(file);
      if (!selectedId || !file.models.some((model) => model.id === selectedId)) {
        selectedId = file.models.find((model) => model.status === 'active')?.id ?? file.models[0]?.id ?? null;
      }
    } catch (err) {
      error = message(err);
    } finally {
      loading = false;
    }
  }

  async function reload() {
    if (dirty && !(await ed.ask('放弃未保存的修改？', '重新载入会用磁盘上的 leaderboard.json 覆盖当前改动。', '重新载入', true))) return;
    await load();
  }

  /** 保存榜单。榜单模式下 Ctrl+S 也会走到这里。 */
  async function save(): Promise<boolean> {
    if (!file || saving) return false;
    // 先把必然写不进文件的问题挑出来，省得来回试接口；其余字段交给后端按 parseLeaderboard 的规则校验。
    const missing = file.models.find((model) => !model.name.trim() || !model.vendor.trim() || !model.blurb.trim() || !model.review.trim());
    if (missing) {
      selectedId = missing.id;
      const field = !missing.name.trim() ? '名称' : !missing.vendor.trim() ? '厂商' : !missing.blurb.trim() ? '一句话结论' : '点评';
      ed.toast('error', `“${missing.name || missing.id}”的${field}还没填，补完再保存`);
      return false;
    }
    saving = true;
    const payload = $state.snapshot(file) as LeaderboardFile;
    payload.updatedAt = todayISO();
    try {
      const result = await api.saveLeaderboard(payload);
      file = result.file;
      savedSnapshot = snapshotOf(file);
      savedAt = Date.now();
      ed.toast('ok', '榜单已保存');
      await ed.refreshGit(true);
      return true;
    } catch (err) {
      ed.toast('error', `保存榜单失败：${message(err)}`);
      return false;
    } finally {
      saving = false;
    }
  }

  async function loadCandidates(refresh: boolean) {
    if (candidatesLoading) return;
    candidatesLoading = true;
    candidatesWarning = null;
    try {
      const result = await api.candidates(refresh);
      candidates = result.candidates;
      candidatesFetchedAt = result.fetchedAt;
      candidatesWarning = result.warning ?? null;
    } catch (err) {
      candidates = [];
      candidatesFetchedAt = null;
      candidatesWarning = `候选池加载失败：${message(err)}`;
    } finally {
      candidatesLoading = false;
    }
  }

  function addCandidate(entry: CatalogEntry, tier: TierId) {
    if (!file) return;
    if (file.models.some((model) => model.id === entry.id)) {
      selectedId = entry.id;
      ed.toast('info', '这个模型已经在榜单里了');
      return;
    }
    const maxOrder = Math.max(0, ...file.models.filter((model) => model.tier === tier).map((model) => model.order));
    const model = emptyModel(entry.id, entry.name, entry.vendor, tier, maxOrder + 1);
    file.models.push(model);
    candidates = candidates.filter((candidate) => candidate.id !== entry.id);
    selectedId = model.id;
    ed.toast('info', `已把“${entry.name}”放进${TIERS.find((item) => item.id === tier)?.name ?? tier}档，补完结论和点评再保存`);
  }

  // ── 拖拽与排序 ─────────────────────────────────────────────────────────────

  function startDrag(event: DragEvent, model: LeaderboardModel) {
    dragId = model.id;
    overTier = null;
    overId = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', model.id);
    }
  }

  function dragOverTier(event: DragEvent, tier: TierId) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    overTier = tier;
    overId = null;
  }

  function dragOverRow(event: DragEvent, tier: TierId, id: string) {
    event.preventDefault();
    event.stopPropagation();
    overTier = tier;
    overId = id;
  }

  function endDrag() {
    dragId = null;
    overTier = null;
    overId = null;
  }

  function dropTier(event: DragEvent, tier: TierId) {
    event.preventDefault();
    const id = dragId ?? event.dataTransfer?.getData('text/plain') ?? null;
    if (id) moveTo(id, tier, null);
    endDrag();
  }

  function dropRow(event: DragEvent, tier: TierId, beforeId: string) {
    event.preventDefault();
    event.stopPropagation();
    const id = dragId ?? event.dataTransfer?.getData('text/plain') ?? null;
    if (id && id !== beforeId) moveTo(id, tier, beforeId);
    endDrag();
  }

  /** 把一档里的 order 从 1 重排。 */
  function reorderTier(tier: TierId) {
    if (!file) return;
    file.models
      .filter((model) => model.status === 'active' && model.tier === tier)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN'))
      .forEach((model, index) => {
        model.order = index + 1;
      });
  }

  /**
   * 把模型挪到某一档。beforeId 为 null 时放到该档最后，否则放在这一条前面。
   * 下榜的模型被拖动时自动重新上架，并清掉下榜日期。
   */
  function moveTo(id: string, tier: TierId, beforeId: string | null) {
    if (!file) return;
    const model = file.models.find((item) => item.id === id);
    if (!model) return;
    const from = model.tier;
    model.tier = tier;
    if (model.status !== 'active') {
      model.status = 'active';
      delete model.retiredAt;
    }
    const others = file.models
      .filter((item) => item.status === 'active' && item.tier === tier && item.id !== id)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'zh-CN'));
    const index = beforeId ? others.findIndex((item) => item.id === beforeId) : others.length;
    others.splice(index < 0 ? others.length : index, 0, model);
    others.forEach((item, position) => {
      item.order = position + 1;
    });
    if (from !== tier) reorderTier(from);
    selectedId = id;
  }

  /** 键盘兜底：档内上移 / 下移。 */
  function moveStep(id: string, delta: number) {
    if (!file) return;
    const model = file.models.find((item) => item.id === id);
    if (!model) return;
    const list = activeList(model.tier);
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return;
    const target = list[index + delta];
    if (!target) return;
    moveTo(id, model.tier, delta < 0 ? target.id : (list[index + 2]?.id ?? null));
  }

  /** 键盘兜底：换档，排到目标档最后。 */
  function changeTier(id: string, tier: TierId) {
    moveTo(id, tier, null);
  }

  function restore(id: string) {
    if (!file) return;
    const model = file.models.find((item) => item.id === id);
    if (!model) return;
    model.status = 'active';
    delete model.retiredAt;
    const maxOrder = Math.max(0, ...file.models.filter((item) => item.id !== id && item.status === 'active' && item.tier === model.tier).map((item) => item.order));
    model.order = maxOrder + 1;
    selectedId = id;
    ed.toast('info', `已把“${model.name}”重新上架，记得保存`);
  }
</script>

<div class="lb-work">
  <header class="lb-head">
    <div class="lb-title">
      <h1>榜单</h1>
      <span class="lb-file">site/src/data/leaderboard.json</span>
      {#if dirty}
        <span class="ed-badge warn">未保存</span>
      {:else if savedAt}
        <span class="ed-badge ok">已保存</span>
      {/if}
    </div>
    <p class="lb-status">{file ? `${file.models.length} 个模型，更新于 ${file.updatedAt}` : '读取中…'}</p>
    <span class="lb-spacer"></span>
    <button type="button" class="ed-btn" onclick={reload} disabled={loading || saving}><Icon icon={iArrowClockwise} size={14} />重新载入</button>
    <button type="button" class="ed-btn primary" onclick={save} disabled={!dirty || saving}>
      {#if saving}<span class="ed-spinner"></span>{:else}<Icon icon={iFloppyDisk} size={14} />{/if}保存榜单
    </button>
  </header>

  <div class="lb-body">
    <aside class="lb-pane lb-left" aria-label="候选池和档位">
      <CandidatePool
        {candidates}
        fetchedAt={candidatesFetchedAt}
        loading={candidatesLoading}
        warning={candidatesWarning}
        onrefresh={() => loadCandidates(true)}
        onadd={addCandidate}
      />

      <section class="lb-sec">
        <div class="lb-sec-head">
          <h2>档位</h2>
          <span class="lb-count">{items.length}</span>
          <span class="lb-hint">拖动行可以换档和排序，也能用每行的上下按钮和档位下拉。</span>
        </div>

        {#if loading}
          <p class="ed-empty"><span class="ed-spinner"></span>读取榜单…</p>
        {:else if error}
          <p class="lb-warn">读不了榜单：{error}</p>
        {:else}
          {#each groups as group (group.tier.id)}
            <section class="lb-tier" style={`--tier: var(--tier-${group.tier.id})`}>
              <div class="lb-tier-head">
                <span class="lb-tier-dot" aria-hidden="true"></span>
                <h3 class="lb-tier-name">{group.tier.name}</h3>
                <span class="lb-count">{group.items.length}</span>
                <span class="lb-tier-blurb">{group.tier.blurb}</span>
              </div>
              <ul class="lb-rows" ondragover={(event) => dragOverTier(event, group.tier.id)} ondrop={(event) => dropTier(event, group.tier.id)}>
                {#each group.items as model (model.id)}
                  <li
                    class="lb-row"
                    class:selected={model.id === selectedId}
                    class:over={overId === model.id}
                    class:over-tier={overTier === group.tier.id && !overId}
                    draggable="true"
                    ondragstart={(event) => startDrag(event, model)}
                    ondragover={(event) => dragOverRow(event, group.tier.id, model.id)}
                    ondrop={(event) => dropRow(event, group.tier.id, model.id)}
                    ondragend={endDrag}
                  >
                    <span class="lb-drag" aria-hidden="true"><Icon icon={iDotsSixVertical} size={14} /></span>
                    <button type="button" class="lb-row-main" onclick={() => (selectedId = model.id)} aria-pressed={model.id === selectedId}>
                      <span class="lb-order tabular">{model.order}</span>
                      <span class="lb-row-name" title={model.name}>{model.name}</span>
                      <span class="lb-row-vendor">{model.vendor}</span>
                    </button>
                    <span class="lb-row-actions">
                      <button type="button" class="ed-icon sm" onclick={() => moveStep(model.id, -1)} aria-label={`把 ${model.name} 上移`}>
                        <Icon icon={iCaretUp} size={12} />
                      </button>
                      <button type="button" class="ed-icon sm" onclick={() => moveStep(model.id, 1)} aria-label={`把 ${model.name} 下移`}>
                        <Icon icon={iCaretDown} size={12} />
                      </button>
                      <select
                        class="ed-input lb-tier-select"
                        value={model.tier}
                        onchange={(event) => changeTier(model.id, (event.currentTarget as HTMLSelectElement).value as TierId)}
                        aria-label={`把 ${model.name} 换到别的档位`}
                      >
                        {#each TIERS as tier}<option value={tier.id}>{tier.name}</option>{/each}
                      </select>
                    </span>
                  </li>
                {/each}
                {#if !group.items.length}
                  <li class="lb-row-empty">把模型拖到这里，或者从候选池加一个。</li>
                {/if}
              </ul>
            </section>
          {/each}

          {#if retired.length}
            <section class="lb-tier lb-retired">
              <div class="lb-tier-head">
                <span class="lb-tier-dot" aria-hidden="true"></span>
                <h3 class="lb-tier-name">已下榜</h3>
                <span class="lb-count">{retired.length}</span>
                <span class="lb-tier-blurb">页面上不显示，数据还留着，随时可以重新上架。</span>
              </div>
              <ul class="lb-rows">
                {#each retired as model (model.id)}
                  <li class="lb-row" class:selected={model.id === selectedId}>
                    <span class="lb-drag" aria-hidden="true"></span>
                    <button type="button" class="lb-row-main" onclick={() => (selectedId = model.id)} aria-pressed={model.id === selectedId}>
                      <span class="lb-order tabular">·</span>
                      <span class="lb-row-name" title={model.name}>{model.name}</span>
                      <span class="lb-row-vendor">{model.retiredAt ? `${model.retiredAt} 下榜` : '已下榜'}</span>
                    </button>
                    <span class="lb-row-actions">
                      <button type="button" class="ed-btn sm quiet" onclick={() => restore(model.id)}>重新上架</button>
                    </span>
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      </section>
    </aside>

    <section class="lb-pane lb-form-pane" aria-label="模型表单">
      {#if loading}
        <div class="ed-empty"><span class="ed-spinner"></span>读取榜单…</div>
      {:else if selected}
        <ModelForm model={selected} />
      {:else if file}
        <div class="ed-empty">在左边选一个模型，这里改它的字段。预览会跟着实时变。</div>
      {:else}
        <div class="ed-empty">读不了榜单文件，看一下终端里的报错。</div>
      {/if}
    </section>

    <section class="lb-preview" aria-label="榜单预览">
      <div class="lb-preview-head">
        <h2>实时预览</h2>
        <span class="lb-hint">和站点上的榜单渲染的是同一个 TierBoard 组件</span>
      </div>
      <div class="lb-preview-scroll">
        {#if loading}
          <div class="ed-empty"><span class="ed-spinner"></span>读取榜单…</div>
        {:else if error}
          <div class="ed-empty">读不了榜单：{error}</div>
        {:else if items.length}
          <TierBoard {items} selectedId={selectedId ?? undefined} onselect={(id) => (selectedId = id)} />
        {:else}
          <div class="ed-empty">榜单还是空的。从候选池加几个模型吧。</div>
        {/if}
      </div>
    </section>
  </div>
</div>
