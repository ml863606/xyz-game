# 星际飞刀王

俯视视角飞刀竞技小游戏，Godot 4 运行。

## 玩法

- `WASD` / 方向键：调整飞刀航向
- `Space`：短促推进并进入滑翔
- `R`：重开

飞刀沿星际竞技轨道前进，贴近引力峰会获得长距离滑翔。弧形陨石带会反弹飞刀，命中亮黄恒星目标得分并产生爆破反馈。

飞刀有 3 点耐久，撞击陨石或星云边界会损伤机体，耐久归零后坠毁，按 `R` 重新开始。

## 运行

```powershell
cd D:\WorkSpace\mxl\xyz\xyz-game\星际飞刀王
godot --path .
```

## 素材

可替换美术在 `assets/`：

- `assets/sprites/star_knife.svg`
- `assets/sprites/asteroid_cluster.svg`
- `assets/sprites/star_target.svg`
- `assets/ui/icons/glide.svg`

星轨、等高线、星云屏障和羊皮纸纹理由 `scripts/game.gd` 根据引力高度贴图实时绘制。
