# 资产说明

本项目把静态美术和玩法逻辑分开维护。

## sprites

- `star_knife.svg`：玩家飞刀，焰红尾翼和暖金刀身。
- `asteroid_cluster.svg`：赭石暗棕小行星簇，用于反弹障碍和弧形坡道。
- `star_target.svg`：亮黄恒星目标，命中后计分和爆破。

## ui/icons

- `glide.svg`：滑翔状态图标。

## 程序化画面

`scripts/game.gd` 负责生成复古星图底图、引力等高线、竞技轨道、星云边界和老旧星纸纹理。这些元素跟随引力高度贴图变化，属于运行时地图表现。
