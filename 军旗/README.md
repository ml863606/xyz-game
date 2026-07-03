# 童年翻军棋

纯 JavaScript/Canvas 实现的军棋翻棋小游戏，支持人机练习、本地双人和本地 WebSocket 在线双人对战。

## 当前内容

- 6 x 8 纯格子棋盘
- 第一次翻出的颜色确定玩家阵营
- 保留地雷和炸弹
- 上下左右一格移动
- 军衔大小、同级同归于尽、炸弹同归于尽、工兵排雷
- 房间码在线对战
- 短语和表情消息

## 启动

安装依赖：

```bash
npm install
```

启动静态预览：

```bash
npm run preview
```

启动本地联机房间服务：

```bash
npm run server
```

浏览器打开：

```text
http://127.0.0.1:4177/
```

联机测试时打开两个浏览器窗口：一个创建房间，另一个输入房间码加入。

## 文件

- `game.js`：Canvas 游戏 UI、单机模式、在线模式接入
- `rules.cjs`：军旗翻棋规则引擎，客户端和服务端共用
- `online-client.js`：浏览器/抖音 WebSocket 客户端适配
- `room-server.cjs`：本地 WebSocket 房间服务
- `preview-server.cjs`：本地静态预览服务
