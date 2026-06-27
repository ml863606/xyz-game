# Animal Chess

斗兽棋双人好友房小游戏原型，目标平台为抖音小游戏中心。项目采用 Cocos Creator 3.8.x 目录形态，并提供浏览器预览用于快速验证规则和联网流程。

## Scripts

- `npm run check`：TypeScript 类型检查。
- `npm test`：规则与房间协议测试。
- `npm run build:web`：构建浏览器预览入口到 `web-dist/main.js`。
- `npm run server`：启动 WebSocket 好友房服务，默认 `ws://localhost:8787`。
- `node scripts/preview-server.mjs`：启动静态预览服务，默认 `http://localhost:4174`。

## Douyin Mini Game Notes

- Cocos Creator 构建平台选择 ByteDance Mini Game。
- 抖音端通过 `tt.login` 获取登录 code，通过 `tt.shareAppMessage` 分享房间号，通过 `tt.connectSocket` 连接对战服务。
- 上线前需要将 WSS 域名加入抖音小游戏后台白名单，并准备隐私协议、用户协议、图标、截图和审核资料。
