# 会客厅 · Hometown Room Demo 3.0

连接游客与独立小店的可交互 Web 原型。一个人第一次到陌生小镇，怎么敢走进一家店？店主又怎么知道游客在反复问什么？这个 Demo 把两端体验都做出来了——游客端看地区、小镇、店铺、"今天怎么过"；店主端看游客回声、补资料、生成内容。

单文件 HTML，约 48 MB，图片全部内嵌，双击即可离线打开。

![首页](assets/screenshots/01-home.jpg)

## 在线预览

[https://a15242408085-bot.github.io/huiketing/dist/会客厅Demo%203.0.html](https://a15242408085-bot.github.io/huiketing/dist/会客厅Demo%203.0.html)

## 本地运行

直接双击 `dist/会客厅Demo 3.0.html`，无需服务器、无需构建、无需 npm。

如需从源码构建：

```sh
python3 build.py
```

Python 3.9+，无第三方依赖。

## 页面一览

### 选地区

3 个虚构地区：江南水乡（云溪镇 3 家店）、山野茶路（石岙镇 2 家店）、海风渔村（筹备中）。每个地区挂对应摄影背景，浮动照片墙带日期戳，像一本去过的地方的相册。

![选地区](assets/screenshots/02-regions.jpg)

### 小镇与店铺

进入云溪镇，能看到小镇照片 hero、三家店铺卡（桥西茶寮、阿沅面馆、南栅竹编所），每家店都有对应实拍风格配图。"今天怎么过"是条件选择式行程草稿，选完直接生成可带走的安排。

![云溪镇](assets/screenshots/03-yunxi.jpg)

### 店主工作台

选一家店进入店主工作台，"游客回声"tab 是核心看板：本期接待摘要（对话次数/到店卡/未解决缺口）、游客反复关心的主题条形图、优先补充红边卡、覆盖率堆叠条、游客授权回声引用、内容生成入口。所有数据标注为 Demo 示例。

![店主工作台](assets/screenshots/04-owner.jpg)

## 技术特点

- **单文件构建**：`build.py` 把 CSS、JS、图片 base64 全部打包进一个 HTML，original 原型字节逐字节校验，只在 `</head>`/`</body>` 前追加视觉层
- **零依赖**：纯原生 JS/CSS，没有 React/Vue 运行时负担（页面本身的 React bundle 已打包进 original）
- **渐进增强**：视觉模块独立挂载，不改动原有交互逻辑、路由、文案
- **多地区扩展**：新增地区只需在数据里加一条，hero 渐变和店铺配图自动匹配

## 目录结构

```
huiketing/
├── original/              # 脱敏后的原始原型 HTML
├── src/                  # 追加的视觉与交互模块（JS + CSS）
│   ├── owner-dashboard.js # 店主看板 + 3D 倾斜卡片
│   ├── today-planner.js   # 今天怎么过
│   ├── town-selection.js  # 多地区多小镇多店铺
│   ├── contact-sheet.js    # 浮动照片墙日期戳
│   └── ...
├── assets/                # 公开素材（摄影图、店铺图、截图）
├── build.py               # 单文件构建脚本
└── dist/                  # 产物（单文件 HTML）
```

## 许可

代码与文档采用 MIT。原型内第三方代码遵循原许可，见 `THIRD_PARTY_NOTICES.md`。素材（摄影图、AI 生成图）各有其来源与权利，不因代码 MIT 而改变。
