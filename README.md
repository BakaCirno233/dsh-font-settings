# dsh-font-settings

DSH（DeepSeek Harness）字体设置插件：在设置页自由更换界面字体、调整字号、单独设置代码字体，并支持回滚字体（fallback）兜底。使用系统已安装字体，无需联网加载。

## ✨ 功能

| 设置项 | 说明 |
|--------|------|
| **字体** | 全局字体（消息气泡、侧边栏、设置页等全部区域），支持常见系统字体预设 + 自定义输入 |
| **字号** | 聊天内容区域字号，10~24px 可调（默认 14px） |
| **代码字体** | 代码块/终端等宽字体独立设置（JetBrains Mono、Fira Code、Consolas 等） |
| **回滚字体** | 主字体缺字时兜底显示（如生僻字、特殊符号），正文和代码都生效 |

交互细节：
- 调整时仅在设置面板内**预览效果**，点击「保存设置」后才全局应用，不会改一下立刻变全界面
- 有未保存修改时可「放弃修改」
- 设置持久化到 localStorage，重启不丢
- 「恢复默认设置」一键还原

## 📦 安装

在 chat profile 下安装：

```bash
dsh plugin --profile chat add github:BakaCirno233/dsh-font-settings
```

> chat profile 即 DSH Desktop 的聊天界面 profile。安装后需重启 DSH Desktop 生效。

## ⚙️ 使用

1. 打开 DSH Desktop 的 **设置页**
2. 找到 **「字体设置」** 面板
3. 选择字体/字号/代码字体/回滚字体，实时预览
4. 点 **「保存设置」** 应用

## 🔧 手动安装（本地开发）

将插件链接进 profile 的依赖，并加入 bundle 列表：

```json
// C:\Users\<你>\.dsh\profiles\chat\package.json
{
  "dependencies": {
    "dsh-font-settings": "link:D:/path/to/dsh-font-settings"
  },
  "dsh": {
    "profile": {
      "bundles": [ "...", "dsh-font-settings" ]
    }
  }
}
```

## 🗂 项目结构

```
dsh-font-settings/
├── package.json       # 插件清单（dsh.client.inject 声明）
├── index.js           # host 端入口（CommonJS，纯浏览器端插件）
├── client.js          # 浏览器端：设置面板 + 字体应用逻辑
└── cordis.patch.yml   # bundle 挂载声明
```

## 📝 技术要点

- 使用 `--dsw-font-family` CSS 变量 + `font-family` 属性控制全局字体
- 使用 `--dsh-content-font-size` 控制内容字号，DSH 会自动衍生行高偏移等变量
- 使用 `--ds-font-family-code` 控制代码字体
- 依赖的客户端包为 DSH 2.0.4+ 可用版本（`dsh-client-store` 等，不含已废弃的 `dsh-client-runtime`）
- host 端 `index.js` 使用 CommonJS 语法（`package.json` 未设置 `"type": "module"`），避免 DSH 以 ESM 解析导致崩溃

## 📄 License

MIT
