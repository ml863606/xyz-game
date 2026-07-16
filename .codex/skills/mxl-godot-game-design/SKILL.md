---
name: mxl-godot-game-design
description: 使用 Godogen 初始化新游戏工程，并生成供用户确认的中文游戏提示词。适用于 xyz-game 工作区中创建 Godogen 游戏目录、设计新的 Godot 游戏，或将中文游戏概念整理为 Godot 4 + GDScript 生成提示词的请求。
---

# MXL Godogen 游戏设计

先创建可用的 Godogen 运行时，再将游戏创意整理为完整、可审阅的提示词；用户确认的提示词是后续实现的设计约定。

## 工作流程

1. 定位 Godogen 源目录和目标游戏目录。发布或起草前，读取 `godogen/AGENTS.md`、`godogen/README.md` 与 `godogen/docs/demo_prompts.md`。
2. 检查目标目录。只向空目录发布；若目录已有工程文件，必须保留，并在使用 Godogen 具有破坏性的 `--force` 参数前征求用户确认。
3. 明确选择引擎和代理。本技能默认使用 `godot` 与 `codex`；若用户明确指定 `babylon` 或 `bevy`，应遵循指定值，不得擅自切换引擎。
4. 使用源仓库的发布命令初始化：

```powershell
./publish.sh --engine godot --agent codex --out <目标目录>
```

5. 在 Windows 上先查找可用的 Bash 环境。若 Bash 或 `rsync` 不可用，只能使用 Godogen 源文件及其 `scripts/render_dir.py`、`scripts/generate_codex_metadata.py` 复现发布脚本的既定输出；调用 Python 脚本前设置 `PYTHONUTF8=1`，不得自行改造为其他脚手架。
6. 验证目标目录包含 `AGENTS.md`、所选引擎指南、`.agents/skills/asset-gen`、`agents/openai.yaml`、`.gitignore` 和 Git 仓库。检查生成的说明文件中没有未替换的 Godogen `${...}` 模板变量，检查时排除 `.git/` 钩子文件。
7. 不得在发布后声称游戏已经运行。Godogen 发布的是说明文件和技能，不包含游戏玩法代码。
8. 起草供确认的游戏提示词。在用户确认设计前，不得生成游戏代码、付费购买素材或启动开发服务器。

## 提示词起草

以 `godogen/docs/demo_prompts.md` 的具体程度为标准。若用户只提供游戏名称，可合理推断玩法细节，但应在提示词草案前说明核心假设。

提示词按需覆盖以下内容：

- 游戏类型、视角、单局结构和核心循环；
- 操作方式、移动或碰撞手感、计分、成长、失败和重开机制；
- 重要对象、交互关系和避免挫败感的规则；
- 美术方向、配色、可读性、动画、特效、镜头和 HUD；
- 技术栈采用 Godot 4 与 GDScript，并说明场景、脚本、资源和素材的职责边界；
- 首版范围边界与暂缓功能，防止范围蔓延。

面对中文游戏创意，只提供一段完整的 `中文版` 围栏提示词，供用户审阅并作为后续实现约定。不得附加 `English Version` 或英文翻译。

技术说明使用正向措辞，明确写为“使用 Godot 4 + GDScript”或等价表述，不通过列举其他技术栈来表达选择。输出后请求用户确认设计方向。

## 用户确认后

按照已确认的提示词创建对应引擎的原生工程。遵循生成的引擎指南和工作区的 `mxl-game-design` 技能；将美术放在可替换素材中而非内联到玩法绘制代码；使用引擎原生命令验证，并在交付前本地运行可玩的游戏。
