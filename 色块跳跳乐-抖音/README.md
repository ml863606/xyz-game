# 色块跳跳乐 - 抖音小游戏版

这是 `色块跳跳乐` 的抖音小游戏 Canvas 版本，用原生 JavaScript 实现，不依赖 Godot 运行时。

## 在抖音开发者工具中运行

1. 打开抖音开发者工具。
2. 选择导入小游戏项目。
3. 项目目录选择：

   `D:\WorkSpace\mxl\xyz\xyz-game\色块跳跳乐-抖音`

4. 如果有正式小游戏 AppID，把 `project.config.json` 里的 `appid` 从 `touristappid` 改成你的 AppID。
5. 编译运行。

## 文件结构

- `game.js`：抖音小游戏入口。
- `game.json`：小游戏基础配置。
- `project.config.json`：开发者工具项目配置。
- `js/main.js`：Canvas 初始化和主循环。
- `js/game-state.js`：玩法状态、平台生成、碰撞、分数。
- `js/input.js`：触摸和键盘输入。
- `js/renderer.js`：Canvas 渲染。
- `js/constants.js`：颜色、尺寸、平台类型常量。

## 控制

- 手机触摸：按住屏幕任意位置左右拖动控制移动，点按或上滑触发跳跃。
- 开发者工具键盘：`A/D` 或方向键移动，`Space/W/↑` 跳跃，`R` 重开，`Esc` 回菜单。

## 已实现

- 开始界面、游戏 HUD、失败重开。
- 玩家移动、跳跃、缓冲跳、土狼时间。
- 纵向镜头跟随和平台程序生成。
- 绿色普通、蓝色弹簧、黄色移动、红色碎裂、紫色反向五种平台。
- 高度、最高纪录、连跳显示。
- 使用 `tt.getStorageSync` / `tt.setStorageSync` 保存最高纪录。
