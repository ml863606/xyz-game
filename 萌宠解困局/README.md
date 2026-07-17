# 萌宠解困局

使用 Godot 4 + GDScript 制作的单屏协作解谜游戏。玩家切换小橘、豆包和雪团，利用各自能力破解机关，让全部萌宠抵达出口。

## 当前状态

- [x] Godogen 运行时初始化
- [x] 中文玩法提示词确认
- [x] Godot 工程与主菜单
- [x] 三宠格子移动和切换
- [x] 机关、撤销、重开和三星结算
- [x] 12 个手工关卡
- [x] Godot 4.7.1 本地运行与画面验证

## 素材表

| 名称 | 描述 | 游戏内尺寸 | 路径 | 成本 |
|---|---|---:|---|---:|
| 本地矢量素材组 | 三只萌宠、机关和界面图标 | 48–96 px | `assets/svg/` | 0 |

## 运行

```powershell
godot --path .

# 项目内便携版
.\.tools\godot\Godot_v4.7.1-stable_win64.exe --path .
```

## 验证

```powershell
.\.tools\godot\Godot_v4.7.1-stable_win64_console.exe --headless --path . --script res://scripts/validate_levels.gd
.\.tools\godot\Godot_v4.7.1-stable_win64_console.exe --headless --path . --script res://test/game_state_test.gd
.\.tools\godot\Godot_v4.7.1-stable_win64_console.exe --headless --path . --script res://test/all_levels_smoke.gd
```

## 操作

- `WASD` / 方向键：移动
- `1` / `2` / `3`：切换小橘、豆包、雪团
- `Z` / `U`：撤销
- `R`：重新开始
