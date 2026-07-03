# Douyin Submission Checklist

## Build Scope

- Single-player offline vertical game.
- No backend domain, socket, payment, ads, or leaderboard in v1.
- Runtime platform hooks are isolated behind `scripts/platform_adapter.gd`.

## Materials

- Game name: Dart Balloon / 飞镖扎气球.
- Icon: `icon.svg` can be exported to PNG for the developer console.
- Screenshots: capture at least three portrait gameplay screenshots from Godot or the Douyin developer tool.
- Agreements: prepare user agreement and privacy policy URLs if required by the developer console.
- Filing/copyright: prepare the current console-required mini-game filing, copyright, and qualification materials before submission.

## Douyin Developer Tool Precheck

- 现在本目录根下已经提供抖音小游戏原生 Canvas 入口，可直接把 `D:\WorkSpace\mxl\xyz\xyz-game\飞镖扎气球` 导入抖音开发者工具。
- `game.js` 是抖音小游戏运行入口；Godot 文件保留为原型源码，并通过 `project.config.json` 的 `packOptions.ignore` 排除出小游戏包。
- Confirm portrait orientation.
- Confirm package starts directly into gameplay.
- Confirm no network domain is required for v1.
- Confirm touch drag input works on simulator and real device preview.

## Douyin Developer Tool Import

导入目录：

`D:\WorkSpace\mxl\xyz\xyz-game\飞镖扎气球`

关键文件：

- `game.js`
- `game.json`
- `project.config.json`

如果只是本地调试，可以先用 `touristappid`；正式上传时把 `project.config.json` 里的 `appid` 换成抖音开放平台里的小游戏 AppID。

