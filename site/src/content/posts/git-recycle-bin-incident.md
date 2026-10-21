---
title: '一次rebase卡住会让1675 个文件躺在回收站里吗'
description: '一次推送失败之后仓库里 1675 个文件被删进了回收站，以下是我的补救'
pubDate: 2026-10-21
category: technology
tags: ['排障复盘', 'git', '版本管理', 'Astro', '缓存']
mayBeStale: true
subcategory: 'frontend-tools'
---

10月20号晚上，我在发一篇并查集的长文。`git commit` 很顺利，但是`git push` 报了一个 TLS 错：

```text
fatal: unable to access 'https://github.com/...': schannel: next InitializeSecurityContext failed: SEC_E_INVALID_TOKEN (0x80090308)
```

这大概就是代理抖了一下吗，我没太在意。

但是三分钟后，`git status` 变成了这样：

```text
You are currently editing a commit while rebasing branch 'main' on 'fc7ab06'.
No commands done.
Next command to do (1 remaining command):
  pick e81ae64 # 文章：新增《并查集入门》；词表：更新分类与标签

Changes not staged for commit:
	deleted:    site/src/components/player/PlayingBars.svelte
	deleted:    site/src/components/post/Comments.svelte
	...
no changes added to commit
```
（卧槽，删库了！！！）

`## main...origin/main` 后面还多了两个字：`[gone]`。

于是121 个文件显示被删除，分支卡在一个我没见过的提交 `fc7ab06` 上，而且远端引用也消失了。怎么回事，是rebase 冲突了，工作区脏了吗。

## 止血

### 一、停掉还挂在后台的部署

`npm run deploy` 的进程树从 19:18 一直挂到 19:33，`astro build` 卡在中间。它是在**工作区已经被切坏之后**启动的，也就是说，如果它成功了，它会把一棵不完整的树推上线。

```powershell
taskkill /PID 15104 /T /F
```

### 二、清掉挡路的 `index.lock`

`git rebase --abort` 直接失败：

```text
error: Unable to create '.git/index.lock': File exists.
Another git process seems to be running in this repository
```

但进程表里一个 `git.exe` 都没有。这个锁是**上一次被打断的 git 留下的**，可以直接删。

### 三、abort，看能回到哪一步

```powershell
Remove-Item .git\index.lock
git rebase --abort
```

结果：`HEAD` 回到我自己的 `e81ae64`，`site/src` 的 153 个文件全部回来了，工作区干净。

---

**所以"121 个文件被删"根本不是删除，那是 rebase 把工作区检出了 `fc7ab06` 之后还没开始 pick 的中间状态**。它相对 `e81ae64` 看起来就是"少了一堆文件"。

另一方面，其实`No commands done` 说明 rebase 一步都没执行，什么都没被改写。

## 追因： `.git` 的问题

虽然现在文件回来了，但还是有两件事对不上：

- `origin/main` 还是 `[gone]`；
- `git reflog` 输出是**空的**。

reflog 是一个只增不减的日志，正常仓库不可能没有。这说明丢的不是工作区是 `.git` 内部。

于是我去看了回收站：

```powershell
$shell = New-Object -ComObject Shell.Application
$bin = $shell.Namespace(0xA)
@($bin.Items() | Where-Object { ($bin.GetDetailsOf($_, 1)) -like 'D:\python\puresky-blog*' }).Count
```

**我去，整整1675项！**

按目录分组：

| 位置 | 数量 |
| :--- | ---: |
| `.git\objects\**` | 1181 |
| `site\src\**` | 332 |
| `site\dist\**` | 55 |
| `site\node_modules\**` | 50 |
| 其它（`.git` 的 lock / refs / logs / rebase 状态，零星缓存） | 57 |
| **合计** | **1675** |

这怎么可能呢，要知道被 git 丢弃的文件是直接 `unlink` 的，不进回收站。而回收站里有 1675 项，那就意味着这是一次**文件管理器级别的删除**——某个工具/某个"丢弃全部改动"/某个同步动作把整片目录当作普通文件删掉了，于是 refs、reflog、对象库和图片一起进了回收站。

具体来说：

- `origin/main` 不见了 → `refs/remotes/origin/main` 被删了
- `reflog` 是空的 → `.git/logs` 被删了
- rebase 卡在半路 → 它的状态文件（`rebase-merge/`）也被删了一部分

## 补救

先跑一次完整性检查：

```powershell
git fsck --no-dangling --no-progress
# 退出码 0，没有输出
```

对象库是完整的：被当前历史引用到的对象都还在，那 1181 个被删掉的 `loose object` 里面没有一个是 HEAD 还需要走到的。

我只恢复了 `site\src\**` 里那些**不进仓库**的文件。

## 三张图差点寄了

我们的站点有一条约定：文章配图（`site/src/content/posts/images/`）和本机插画（`site/src/assets/local/`）都写进了 `.gitignore`，只在本机存在。仓库里 clone 下来是没有图的。

换句话说，在像这次的事故中——**它们没有 git 兜底。**

当然可以从回收站恢复，我恢复了16 张，4 张本来就在，但 `post-20261011-2` 的两张和 `post-20261011-3` 的一张**已经不在回收站里了**。

最后的救命稻草是 `site/dist/_astro/`：上一次成功构建的成品还在回收站里（它们和 dist 一起被删的）。

```text
mv3lvz8z-image: png 422x222
mv3lwfpl-image: png 542x222
mv3sfl2e-image: png 412x161
```

这都是原始尺寸的 PNG，不是转码过的 webp——`dist` 里存的就是 png，说明这几张在构建时没被转格式，捞出来就是原图，放回去无损。

插画也是同样的运气：`home`（1750×1080 PNG）和 `about`（2560×1581 webp）都在回收站里的 `dist\_astro` 下，找回来之后放进 `src/assets/local/`——首页 hero 和关于页 banner 读的就是这个目录。

## 我去，还有第二关

ok现在构建通过了，117 页没有任何报错。

但线上打开 `post-20261018`、`post-20261011-2`、`post-20261011-3`，正文里的图**一张都没有**。而 `post-20261019` 的三张图好好的。

想想看：

- 文件确实在，我用脚本把 18 处图片引用和落盘文件一一比对过
- 构建**没有** `[remark-local-images] 找不到 ...` 的警告——这个插件对缺失的图会打警告并跳过，而它居然没报警？

也就是说图不是被"跳过"的，是**在更早的地方就不存在了**。

让我们在插件里临时加一行调试输出：

```js
const abs = path.resolve(dir, rel);
console.error('[dbg-img]', node.url, '=>', abs, String(existsSync(abs)));
```

重新构建，`[dbg-img]` **一次都没打印。**

`remark-local-images` 根本没看到任何图片节点，说明图片在它之前就已经没了——**整段 markdown 的渲染结果被缓存下来了**。

## 缓存

`site/.astro` 是内容缓存，清理它没屁用。

真正的位置是另外两处：

```powershell
Remove-Item -Recurse -Force site\.astro, site\node_modules\.astro, site\node_modules\.vite
npm run build
```

清完再构建：

```text
post-20261018: 2 张
post-20261011-2: 2 张
post-20261011-3: 7 张
post-20261012: 1 张
post-20261014-2: 1 张
post-20261019: 3 张
```

wow，现在全回来了。

**原因**：图片缺失的那一次构建（`astro build` 在图片还没恢复时跑过），`remark-local-images` 把图片节点裁掉、连空段落一起删了，这个结果被写进了 Vite/Astro 的转换缓存。后来文件恢复了，但 `.md` 文件本身的 mtime 没变——缓存认为"输入没变"，就把那个"没有图"的结果原样交了出来。

那`post-20261019` 为什么是好的？因为它的图片恰好在那次缓存生成之前就已经回来了。

**同一个仓库里两种表现**，这就是缓存问题的典型特征。

## 复盘

### 1. 把"文件不见"和"内容不见"分开

`git status` 说 121 个文件被删除的时候我差点就去 `git checkout .` 了，幸好先看了一眼 `No commands done`。

rebase 中途的 `git status` 是**检出到一半的视图**，不是"你的文件被删了"。判断依据是 rebase 的状态目录和 `orig-head`：

```powershell
Get-Content .git\rebase-merge\head-name   # refs/heads/main
Get-Content .git\rebase-merge\orig-head   # e81ae64...
Get-Content .git\rebase-merge\onto        # fc7ab06...
Get-Content .git\rebase-merge\git-rebase-todo
```

我们看到 `pick` 还在 todo 里而`done` 是空的，也就是说它其实一步都没执行。

### 2. git 不用回收站

只要回收站里出现 `.git` 里的东西，就可以直接排除"git 命令删的"。**这可以把"我的 git 操作出了问题"导向"有另一个东西在删文件"**，这两种假设的排查方向是完全不同的。

### 3. 先停后台任务再动手

恢复的第一步应该是停掉所有还在写东西的进程，比如那个 `npm run deploy`。

### 4. 本地资产是单点

`src/content/posts/images/` 和 `src/assets/local/` 都不进仓库。这次能救回来靠的是**上一次构建的成品恰好也在回收站里**——这纯运气。

如果这几张图当时已经被覆盖或者 dist 被清过那就真的没了。所以应该做的是把这两个目录定期同步到仓库之外的地方（另一块盘、一个私有仓库），而不是依赖"dist 里也许还有一份"。

### 5. 缓存会记住错误，而且比错误活得久

文件回来了 ≠ 构建看得见。

判断"在哪一层丢的"最省时间的办法不是在脑子里推，而是**在可疑的插件里打一行日志**：它打印了，问题在它之后，它没打印，问题在它之前。

清缓存也要清对地方：`site/.astro` 只解决一部分，`node_modules/.astro` 和 `node_modules/.vite` 才是那次真正的凶手。

### 6. 推送失败的 TLS 错误，重试一次再说

`SEC_E_INVALID_TOKEN` 看着吓人，实际上是本机代理（`127.0.0.1:7890`）那一刻没接上。十分钟后同样的命令直接成功。**在把它当成"远端坏了"之前，先 `git ls-remote origin` 试一次。**
