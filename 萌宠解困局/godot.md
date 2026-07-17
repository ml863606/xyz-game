# Godot 4 + GDScript 工程指南

## 技术栈

- Godot 4 标准版
- 类型化 GDScript
- 2D 正交俯视表现，使用 SVG/PNG 可替换素材
- 逻辑格坐标与显示动画分离

## 项目结构

- `project.godot`：输入、窗口和主场景配置
- `scenes/`：主场景及可复用界面场景
- `scripts/`：玩法状态、视图和界面控制
- `data/`：关卡 JSON 数据
- `assets/`：运行时加载的图像与字体素材
- `screenshots/`：运行验证截图

玩法规则集中在 `GameState`，场景显示集中在 `BoardView`，菜单、HUD 和流程由 `Main` 管理。关卡布局通过 JSON 读取；角色、机关和界面素材通过资源路径加载。

## 验证

```powershell
godot --headless --import --quit --path .
godot --headless --path . --script res://scripts/validate_levels.gd
godot --headless --check-only --path .
godot --path .
```

交付以实际启动、无脚本错误、12 个关卡可加载且核心流程可操作为准。
