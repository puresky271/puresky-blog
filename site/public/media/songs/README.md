# 本地曲库

把带歌词的音频放在这里，构建时会被扫描成本地曲库，首页舞台和右下角播放器都能播放。
约定和 mygo_chat 的 `lyrics_songs/` 一致，按文件名配对：

```
歌名.flac                 音频（.flac / .mp3 / .m4a / .ogg / .wav）
covers/歌名.jpg           封面（.jpg / .png / .webp）
lrc/歌名.ja.lrc           原文歌词
lrc/歌名.zh.lrc           中文歌词
lrc/歌名.phonetic.lrc     注音
lrc/歌名.lrc              只有一种歌词时用这个
videos/歌名.mp4           MV，有它就能在首页进入视频过载
videos.json               可选：{ "歌名.flac": { "local": "x.mp4", "bvid": "BV...", "page": 1 } }
songs.json                可选：{ "歌名": { "artist": "...", "album": "...", "order": 1,
                                         "coverFit": { "position": "50% 14%" }, "tone": "light" } }
```

注意：Cloudflare Pages 单文件上限 25MB，无损音频和视频通常会超。
大文件的做法是把同样的目录结构传到 R2，构建时设置
`MEDIA_DIR`（本地副本的位置）和 `PUBLIC_MEDIA_BASE`（R2 的访问地址），见 `src/lib/local-media.ts`。
