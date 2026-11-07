# 第三方声明

本仓库的 MIT 许可适用于本项目自有的原型业务代码、视觉增强代码、构建脚本与文档。既有原型的内联应用 bundle 包含第三方实现，相关权利和许可继续归各自作者所有。本仓库未提供原型的原始依赖锁文件，因此不虚构具体包版本，也不声称此处是一份完整的软件物料清单。

## React 与 ReactDOM

原型使用 React 与 ReactDOM。它们采用 MIT 许可证，许可文本见 [licenses/React.txt](licenses/React.txt)，上游为 [facebook/react](https://github.com/facebook/react)。原型已包含这些运行时代码，视觉增强没有另行安装 React，也没有创建新的 React 树。

## React Router

原型 bundle 包含 React Router 相关路由实现。React Router 采用 MIT 许可证，许可文本见 [licenses/ReactRouter.txt](licenses/ReactRouter.txt)，上游为 [remix-run/react-router](https://github.com/remix-run/react-router)。其具体版本未从现有原型中确认。

## Lucide 与 Feather 图标许可

原型内联图标可能包含 Lucide / Feather 衍生实现；在缺少原型依赖清单的情况下保留相关许可文本。Lucide 采用 ISC 许可证，部分来自 Feather 的实现采用 MIT 许可证，文本见 [licenses/Lucide.txt](licenses/Lucide.txt)，上游为 [lucide-icons/lucide](https://github.com/lucide-icons/lucide)。此声明不表示额外安装了图标库。

## 字体与图片

原型保留已有 Google Fonts 链接，字体由相应服务提供并遵循各字体自身的许可；本仓库未打包或重新分发字体文件。网络不可用时使用系统字体回退。

公开演示只包含 `assets/bamboo-water-town.png` 这一张 AI 生成示意图。八个图位与海岸图位复用此图，不代表真实店铺或海岸实景。原本用于私人本地演示的实拍照片、摄影师信息和来源元数据均未包含在本仓库中。

## React Bits 效果参考

视觉方向参考了 React Bits 公开展示的丝绸文字、景深、影像流与视差概念。本仓库采用独立的原生 JavaScript / SVG / CSS 实现，没有安装、复制或分发 React Bits 付费组件源码，也不主张获得其付费源码许可。
