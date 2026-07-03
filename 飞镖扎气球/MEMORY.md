# Memory

- Built from request: "godogen 做一个 飞镖扎气球的游戏, 要上架 抖音游戏中心".
- Target project path: `D:\WorkSpace\mxl\xyz\xyz-game\dart-balloon`.
- `bash` maps to missing WSL on this machine, so godogen runtime files were published with PowerShell copy operations instead of `publish.sh`.
- Local toolchain detected before implementation: `godot --version` -> `4.7.stable.official.5b4e0cb0f`; `dotnet --version` -> `10.0.301`.
- First release scope is offline single-player, no ads/ranking/backend/payment.
- `godot --headless --import --quit` and `godot --headless --check-only --path .` passed after implementation.
- `godot --headless --write-movie ...` crashes on this Windows/Godot 4.7 dummy texture path, but visible movie maker works and produced `screenshots/result/1/capture.avi`.
- `ffmpeg` is not installed on PATH, so the proof video was left as Godot-generated AVI instead of converted MP4.
