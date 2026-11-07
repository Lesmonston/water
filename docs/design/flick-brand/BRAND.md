# Flick 品牌（2026-11-07 用户选定）

取代 [Water 的冰山标志](../water-ui-v1/DESIGN.md)（v1 第 10 节）。用户 11-07：“然后软件名改成Flick，你再设计一下logo”。总控在[画布](https://claude.ai/artifact/QaQwhvVUTZTZQPiLtsJAKS)上出了四个方向（A 弹走的一点、B F 字母、C 缺口圆表、D 一笔弹出），**用户选了 D**。

## 名字

- 软件名 **Flick**：轻轻一弹，把垃圾弹走。
- 改名范围是用户选的“看得见的全改”：
  - 窗口标题、界面里的名字与标志、应用图标、程序文件名 `flick.exe`；
  - 隔离区文件夹改为 `.flick-quarantine`；
  - 数据目录改为 `%LOCALAPPDATA%\Flick`，第一次启动把旧的 Water 目录搬过来；
  - 项目声明文件 `.flick-cleanup.json` 与旧名 `.water-cleanup.json` 都认。
- 代码里的包名、crate 名和仓库名仍叫 `water`，不改。

## 标志：一笔弹出

- **形**：像毛笔收尾的一挑。左下是圆头，往右上一笔收成尖，由粗到细，没有别的元素。几何以 [flick-mark.svg](flick-mark.svg) 为准（48 网格），不改形、不加点。

  ```text
  M12 30.5 C19 22.5 29 13.5 41 8 C32 16 24 27.5 15.8 38.3 A5 5 0 1 1 12 30.5 Z
  ```

- **色**：
  - 界面里只用墨色 `--ink`（`#111418`，与标题同色），不加渐变、光晕或描边。
  - 反白只用在应用图标上：黑色圆角方块（`#15181D`，圆角为边长的 11/48）上的白色标志，标志缩到 70%、居中，见 [flick-app-icon.svg](flick-app-icon.svg)。
  - 强调色（柠檬绿）不进标志；要用也只能整笔上色。
- **字标**：用界面自己的字体写 “Flick”（Segoe UI Variable Display，600），字距 -0.02em，不另带字体文件。画布上的预览用的是 Manrope，只是为了在别的系统上也能看。

## 用在哪里

| 位置 | 尺寸 | 颜色 |
|---|---|---|
| 顶栏品牌（标志 + “Flick”） | 28～30px | 墨色 |
| 关于与隐私页的品牌卡 | 42px | 墨色 |
| 空状态 | 36px | 墨色 |
| 应用图标（宿主 `icons/icon.ico`） | 16、24、32、48、256 | 黑底白标 |

- **应用图标导出件**：[flick-app-icon.ico](flick-app-icon.ico)，由 `node scripts/design/export-app-icon.cjs docs/design/flick-brand flick-app-icon` 从 SVG 生成（本机 headless Chrome 栅格化，五个尺寸都以 PNG 存入 ICO）。宿主换图标时，`apps/water/host/icons/icon.ico` 要与它逐字节相同。
- **雪碧图写法**：标志是实心填充，所以要自带 `fill`，不能沿用全局 `.i` 的描边样式。

  ```html
  <symbol id="i-flick" viewBox="0 0 48 48"><path d="M12 30.5 C19 22.5 29 13.5 41 8 C32 16 24 27.5 15.8 38.3 A5 5 0 1 1 12 30.5 Z" fill="currentColor" stroke="none"/></symbol>
  ```

- **退役**：冰山（`i-berg`）从界面里拿掉，只留在历史文档里。“体检”导航的脉搏线不变。
