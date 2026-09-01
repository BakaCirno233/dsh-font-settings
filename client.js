/**
 * dsh-font-settings — 字体设置（browser client bundle）
 *
 * 功能：在设置页添加「字体设置」面板，允许用户选择系统已安装字体和调整字号。
 * 使用 --dsw-font-family 控制字体，--dsh-content-font-size 控制字号。
 * 所有设置持久化到 localStorage，不依赖网络加载。
 *
 * 参考 dsh-theme-mistglass 的稳定注入模式（DSH 2.0.4+ 兼容）：
 *   - ctx.get('slots') 获取插槽服务
 *   - slots.inject('settings.section', ...) 注入设置面板
 *   - slots.register(...) 注册组件
 *   - React.createElement 而非 JSX
 */
window.__ModuleLoader__.load({
  id: "dsh-font-settings",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // ─── Constants ───────────────────────────────────────────────────────────

    var FONT_FAMILY_KEY   = "dsh-font-settings:font-family";
    var FONT_SIZE_KEY     = "dsh-font-settings:font-size";
    var CODE_FONT_KEY     = "dsh-font-settings:code-font-family";
    var ROLLBACK_FONT_KEY = "dsh-font-settings:rollback-font-family";

    /** 常用系统字体预设（Windows 大概率已安装） */
    var FONT_PRESETS = [
      { id: "default",          label: "系统默认",  value: "" },
      { id: "microsoft-yahei",  label: "微软雅黑",  value: "'Microsoft YaHei','微软雅黑',sans-serif" },
      { id: "dengxian",         label: "等线",      value: "'DengXian','等线',sans-serif" },
      { id: "simsun",           label: "宋体",      value: "'SimSun','宋体',serif" },
      { id: "simhei",           label: "黑体",      value: "'SimHei','黑体',sans-serif" },
      { id: "noto-sans-sc",     label: "思源黑体",  value: "'Noto Sans SC','Source Han Sans SC',sans-serif" },
      { id: "noto-serif-sc",    label: "思源宋体",  value: "'Noto Serif SC','Source Han Serif SC',serif" },
      { id: "lxgw-wenkai",      label: "霞鹜文楷",  value: "'LXGW WenKai','霞鹜文楷',cursive" },
      { id: "segoe-ui",         label: "Segoe UI",  value: "'Segoe UI',sans-serif" },
      { id: "arial",            label: "Arial",      value: "Arial,sans-serif" },
      { id: "custom",           label: "自定义…",   value: "" }
    ];

    /** 代码等宽字体预设（Windows 常用等宽字体） */
    var CODE_FONTS = [
      { id: "default",           label: "系统默认",   value: "" },
      { id: "jetbrains-mono",    label: "JetBrains Mono",  value: "'JetBrains Mono','JetBrainsMono NF',monospace" },
      { id: "fira-code",         label: "Fira Code",  value: "'Fira Code','FiraCode Nerd Font',monospace" },
      { id: "consolas",          label: "Consolas",   value: "'Consolas',monospace" },
      { id: "source-code-pro",   label: "Source Code Pro", value: "'Source Code Pro',monospace" },
      { id: "courier-new",       label: "Courier New", value: "'Courier New',monospace" },
      { id: "custom",            label: "自定义…",    value: "" }
    ];

    // ─── Storage helpers ─────────────────────────────────────────────────────

    function readStorage(key, fallback) {
      try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
    }
    function writeStorage(key, value) {
      try { localStorage.setItem(key, value); } catch {}
    }
    function removeStorage(key) {
      try { localStorage.removeItem(key); } catch {}
    }

    // ─── Font application ────────────────────────────────────────────────────

    /** 字号样式元素 ID，用于注入 !important 规则对抗 DSH 的内联覆盖 */
    var FONT_SIZE_STYLE_ID = "dsh-font-settings-size";

    /**
     * 将字体设置应用到 DOM。
     * fontFamily — 全局字体
     * fontSize — 内容字号
     * codeFont — 代码字体
     * rollbackFont — 回滚字体（fallback），主字体缺字时兜底
     */
    function applyFonts(fontFamily, fontSize, codeFont, rollbackFont) {
      var body = document.body;
      if (!body) return;

      // 构建回滚后缀：非空时追加到主字体后
      var rollbackSuffix = (!rollbackFont || rollbackFont === "default") ? "" : "," + rollbackFont;

      // 全局字体：设置 font-family 属性 + --dsw-font-family 变量于 body
      if (!fontFamily || fontFamily === "default") {
        body.style.removeProperty("font-family");
        body.style.removeProperty("--dsw-font-family");
      } else {
        var fontStack = fontFamily + rollbackSuffix;
        body.style.setProperty("font-family", fontStack);
        body.style.setProperty("--dsw-font-family", fontStack);
      }

      // 字号：通过 !important 规则压制 DSH 的内联覆盖
      // DSH 的 ThemePresenter（ui-layout）会在插件启动后
      // 把 body 内联样式写回 --dsh-content-font-size，覆盖我们的设置。
      // 样式表规则的 !important 优先级高于内联样式，可压制 DSH 的覆盖。
      var size = parseInt(fontSize, 10);
      var sizeStyle = document.getElementById(FONT_SIZE_STYLE_ID);
      if (!isNaN(size) && size >= 8 && size <= 30 && size !== 14) {
        if (!sizeStyle) {
          sizeStyle = document.createElement("style");
          sizeStyle.id = FONT_SIZE_STYLE_ID;
          document.head.appendChild(sizeStyle);
        }
        sizeStyle.textContent = "body{--dsh-content-font-size:" + size + "px!important}";
      } else {
        if (sizeStyle) sizeStyle.textContent = "";
      }

      // 代码字体：回滚后缀也追加到代码字体
      if (!codeFont || codeFont === "default") {
        body.style.removeProperty("--ds-font-family-code");
      } else {
        body.style.setProperty("--ds-font-family-code", codeFont + rollbackSuffix);
      }
    }

    // ─── Settings component ──────────────────────────────────────────────────

    /** 解析存储的字体值为 preset id 或 custom 值 */
    function resolveFamily(saved) {
      if (!saved || saved === "default") return { id: "default", custom: "" };
      var found = FONT_PRESETS.some(function (p) {
        return p.id !== "custom" && p.id !== "default" && p.value === saved;
      });
      if (found) {
        // 匹配预设，返回 preset id
        for (var i = 0; i < FONT_PRESETS.length; i++) {
          if (FONT_PRESETS[i].value === saved) return { id: FONT_PRESETS[i].id, custom: "" };
        }
      }
      // 不匹配预设 → 当作自定义值
      return { id: "custom", custom: saved };
    }

    /** 获取当前字体 family 的 CSS 值 */
    function getFamilyCss(id, custom) {
      if (id === "default") return "default";
      if (id === "custom") return custom || "";
      for (var i = 0; i < FONT_PRESETS.length; i++) {
        if (FONT_PRESETS[i].id === id) return FONT_PRESETS[i].value;
      }
      return "";
    }

    /** 解析存储的代码字体值为 preset id 或 custom 值 */
    function resolveCodeFamily(saved) {
      if (!saved || saved === "default") return { id: "default", custom: "" };
      var found = CODE_FONTS.some(function (p) {
        return p.id !== "custom" && p.id !== "default" && p.value === saved;
      });
      if (found) {
        for (var i = 0; i < CODE_FONTS.length; i++) {
          if (CODE_FONTS[i].value === saved) return { id: CODE_FONTS[i].id, custom: "" };
        }
      }
      return { id: "custom", custom: saved };
    }

    /** 获取代码字体 CSS 值 */
    function getCodeFamilyCss(id, custom) {
      if (id === "default") return "default";
      if (id === "custom") return custom || "";
      for (var i = 0; i < CODE_FONTS.length; i++) {
        if (CODE_FONTS[i].id === id) return CODE_FONTS[i].value;
      }
      return "";
    }

    /** 获取 React —— 全局可用，或通过 require 获取 */
    function getReact() {
      if (typeof React !== "undefined") return React;
      if (typeof require === "function") return require("react");
      return null;
    }

    // ─── Apply (plugin entry) ───────────────────────────────────────────────

    function apply(ctx) {
      // 幂等：只初始化一次
      if (typeof window !== "undefined" && window.__dshFontSettingsApplied) return;
      if (typeof window !== "undefined") window.__dshFontSettingsApplied = true;

      /** 读取存储并应用字体（供启动时调用） */
      function applySavedFonts() {
        var savedFont       = readStorage(FONT_FAMILY_KEY, "default");
        var savedSize       = readStorage(FONT_SIZE_KEY, "14");
        var savedCode       = readStorage(CODE_FONT_KEY, "default");
        var savedRollback   = readStorage(ROLLBACK_FONT_KEY, "default");
        applyFonts(savedFont, savedSize, savedCode, savedRollback);
      }

      // body 可能尚未就绪：立即应用；就绪前轮询几次保证首屏生效。
      if (typeof document !== "undefined") {
        if (document.body) {
          applySavedFonts();
        } else {
          var tries = 0;
          var bootTimer = setInterval(function () {
            tries++;
            if (document.body) {
              clearInterval(bootTimer);
              applySavedFonts();
            } else if (tries > 100) {
              clearInterval(bootTimer);
            }
          }, 100);
          ctx.effect(function () { return function () { clearInterval(bootTimer); }; });
        }
      }

      // ─── 设置面板 ────────────────────────────────────────────────────────
      var slots = ctx.get("slots");
      var disposeRows = [];
      var disposeSettings = function () {
        for (var i = 0; i < disposeRows.length; i++) disposeRows[i]();
      };

      if (slots !== undefined) {
        slots.inject("settings.section", function () {
          var d = slots.register(
            {
              name: "settings.section",
              id: "font-settings",
              order: 50,
              label: "字体设置"
            },
            // 设置面板组件
            function FontSettingsSection() {
              var R = getReact();
              if (!R) return null;

              var useState = R.useState;

              // ── 已保存的值（当前界面上实际生效的） ──
              var savedFont       = readStorage(FONT_FAMILY_KEY, "default");
              var savedSize       = readStorage(FONT_SIZE_KEY, "14");
              var savedCodeFont   = readStorage(CODE_FONT_KEY, "default");
              var savedRollback   = readStorage(ROLLBACK_FONT_KEY, "default");
              var savedResolved     = resolveFamily(savedFont);
              var savedCodeResolved = resolveCodeFamily(savedCodeFont);
              var savedRollResolved = resolveFamily(savedRollback);

              // ── 待保存的值（用户在调整中的） ──
              var _pFamily = useState(savedResolved.id);
              var pendingFamilyId = _pFamily[0];
              var setPendingFamilyId = _pFamily[1];

              var _pCustom = useState(savedResolved.custom);
              var pendingCustomVal = _pCustom[0];
              var setPendingCustomVal = _pCustom[1];

              var _pSize = useState(parseInt(savedSize, 10) || 14);
              var pendingFontSize = _pSize[0];
              var setPendingFontSize = _pSize[1];

              var _pCode = useState(savedCodeResolved.id);
              var pendingCodeId = _pCode[0];
              var setPendingCodeId = _pCode[1];

              var _pCodeC = useState(savedCodeResolved.custom);
              var pendingCodeCustom = _pCodeC[0];
              var setPendingCodeCustom = _pCodeC[1];

              var _pRoll = useState(savedRollResolved.id);
              var pendingRollId = _pRoll[0];
              var setPendingRollId = _pRoll[1];

              var _pRollC = useState(savedRollResolved.custom);
              var pendingRollCustom = _pRollC[0];
              var setPendingRollCustom = _pRollC[1];

              var isCustom     = pendingFamilyId === "custom";
              var isCodeCustom = pendingCodeId === "custom";
              var isRollCustom = pendingRollId === "custom";

              // 是否有未保存的修改
              var pendingCss   = getFamilyCss(pendingFamilyId, pendingCustomVal);
              var pendingCodeCss = getCodeFamilyCss(pendingCodeId, pendingCodeCustom);
              var pendingRollCss = getFamilyCss(pendingRollId, pendingRollCustom);
              var savedCss   = getFamilyCss(savedResolved.id, savedResolved.custom);
              var savedCodeCss = getCodeFamilyCss(savedCodeResolved.id, savedCodeResolved.custom);
              var savedRollCss = getFamilyCss(savedRollResolved.id, savedRollResolved.custom);
              var hasChanges = pendingCss !== savedCss
                || pendingFontSize !== parseInt(savedSize, 10)
                || pendingCodeCss !== savedCodeCss
                || pendingRollCss !== savedRollCss;

              /** 保存：将待保存值写入 localStorage 并应用到界面 */
              function handleSave() {
                var css = getFamilyCss(pendingFamilyId, pendingCustomVal);
                var codeCss = getCodeFamilyCss(pendingCodeId, pendingCodeCustom);
                var rollCss = getFamilyCss(pendingRollId, pendingRollCustom);
                writeStorage(FONT_FAMILY_KEY, css || "default");
                writeStorage(FONT_SIZE_KEY, String(pendingFontSize));
                writeStorage(CODE_FONT_KEY, codeCss || "default");
                writeStorage(ROLLBACK_FONT_KEY, rollCss || "default");
                applyFonts(css, String(pendingFontSize), codeCss, rollCss);
                savedFont = css || "default";
                savedSize = String(pendingFontSize);
                savedCodeFont = codeCss || "default";
                savedRollback = rollCss || "default";
                savedResolved     = resolveFamily(savedFont);
                savedCodeResolved = resolveCodeFamily(savedCodeFont);
                savedRollResolved = resolveFamily(savedRollback);
              }

              /** 放弃：将待保存值重置为已保存的值 */
              function handleDiscard() {
                setPendingFamilyId(savedResolved.id);
                setPendingCustomVal(savedResolved.custom);
                setPendingFontSize(parseInt(savedSize, 10) || 14);
                setPendingCodeId(savedCodeResolved.id);
                setPendingCodeCustom(savedCodeResolved.custom);
                setPendingRollId(savedRollResolved.id);
                setPendingRollCustom(savedRollResolved.custom);
              }

              function handleFamilyChange(e) { setPendingFamilyId(e.target.value); }
              function handleCustomChange(e) { setPendingCustomVal(e.target.value); }
              function handleCodeFamilyChange(e) { setPendingCodeId(e.target.value); }
              function handleCodeCustomChange(e) { setPendingCodeCustom(e.target.value); }
              function handleRollFamilyChange(e) { setPendingRollId(e.target.value); }
              function handleRollCustomChange(e) { setPendingRollCustom(e.target.value); }

              function handleSizeChange(e) {
                var v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 8 && v <= 30) setPendingFontSize(v);
              }
              function decreaseSize() { setPendingFontSize(Math.max(10, pendingFontSize - 1)); }
              function increaseSize() { setPendingFontSize(Math.min(24, pendingFontSize + 1)); }

              /** 恢复默认：立即重置并保存应用 */
              function handleReset() {
                removeStorage(FONT_FAMILY_KEY);
                removeStorage(FONT_SIZE_KEY);
                removeStorage(CODE_FONT_KEY);
                removeStorage(ROLLBACK_FONT_KEY);
                setPendingFamilyId("default");
                setPendingCustomVal("");
                setPendingFontSize(14);
                setPendingCodeId("default");
                setPendingCodeCustom("");
                setPendingRollId("default");
                setPendingRollCustom("");
                applyFonts("default", "14", "default", "default");
                savedFont = "default";
                savedSize = "14";
                savedCodeFont = "default";
                savedRollback = "default";
                savedResolved     = { id: "default", custom: "" };
                savedCodeResolved = { id: "default", custom: "" };
                savedRollResolved = { id: "default", custom: "" };
              }

              // ── Styles ──
              var rowStyle = {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px 0",
                borderBottom: "1px solid var(--dsw-alias-border-l1)"
              };
              var labelStyle = {
                color: "var(--dsw-alias-label-primary)",
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: "1.5",
                flex: "1",
                minWidth: 0
              };
              var hintStyle = {
                display: "block",
                color: "var(--dsw-alias-label-secondary)",
                fontSize: "12px",
                fontWeight: 400,
                lineHeight: "1.5",
                marginTop: "2px"
              };
              var selectStyle = {
                border: "1px solid var(--dsw-alias-border-l2)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "13px",
                background: "var(--dsw-alias-bg-layer-1)",
                color: "var(--dsw-alias-label-primary)",
                minWidth: "140px",
                cursor: "pointer"
              };
              var numberInputStyle = {
                border: "1px solid var(--dsw-alias-border-l2)",
                borderRadius: "6px",
                padding: "4px 6px",
                fontSize: "13px",
                background: "var(--dsw-alias-bg-layer-1)",
                color: "var(--dsw-alias-label-primary)",
                width: "50px",
                textAlign: "center",
                MozAppearance: "textfield"
              };
              var btnSquareStyle = {
                border: "1px solid var(--dsw-alias-border-l2)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "14px",
                lineHeight: "18px",
                background: "transparent",
                color: "var(--dsw-alias-label-primary)",
                cursor: "pointer",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              };
              var customInputStyle = {
                border: "1px solid var(--dsw-alias-border-l2)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "13px",
                background: "var(--dsw-alias-bg-layer-1)",
                color: "var(--dsw-alias-label-primary)",
                width: "100%",
                boxSizing: "border-box",
                marginTop: "8px"
              };

              // ── 预览 ──
              var previewFamilyCss = getFamilyCss(pendingFamilyId, pendingCustomVal);
              var previewLabel = pendingFamilyId === "default" ? "系统默认字体"
                : pendingFamilyId === "custom" ? (pendingCustomVal || "（未输入）")
                : previewFamilyCss;

              var previewCodeCss = getCodeFamilyCss(pendingCodeId, pendingCodeCustom);
              var previewCodeLabel = pendingCodeId === "default" ? "系统默认等宽字体"
                : pendingCodeId === "custom" ? (pendingCodeCustom || "（未输入）")
                : previewCodeCss;

              var previewExampleStyle = {
                fontSize: pendingFontSize + "px",
                lineHeight: "1.6",
                fontFamily: pendingFamilyId === "default" ? "" : previewFamilyCss,
                color: "var(--dsw-alias-label-primary)",
                background: "var(--dsw-alias-bg-layer-1)",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px dashed var(--dsw-alias-border-l1)",
                marginTop: "4px",
                wordBreak: "break-word"
              };

              var codePreviewStyle = {
                fontSize: "13px",
                lineHeight: "1.5",
                fontFamily: pendingCodeId === "default" ? "" : previewCodeCss,
                color: "var(--dsw-alias-label-primary)",
                background: "var(--dsw-alias-markdown-code-block)",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px dashed var(--dsw-alias-border-l1)",
                marginTop: "4px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              };

              // ── 渲染 ──
              return R.createElement("div", { style: { padding: "4px 0 16px", maxWidth: "640px" } }, [
                // 字体选择
                R.createElement("div", { key: "family", style: rowStyle }, [
                  R.createElement("span", { style: labelStyle },
                    "字体",
                    R.createElement("span", { style: hintStyle }, "选择系统已安装的字体，或输入自定义字体名称")
                  ),
                  R.createElement("select", {
                    style: selectStyle,
                    value: pendingFamilyId,
                    onChange: handleFamilyChange
                  }, FONT_PRESETS.map(function (f) {
                    return R.createElement("option", { key: f.id, value: f.id }, f.label);
                  }))
                ]),
                // 自定义字体输入
                isCustom ? R.createElement("div", { key: "custom-input", style: { padding: "0 0 4px" } }, [
                  R.createElement("input", {
                    type: "text",
                    placeholder: "例如: 'PingFang SC', 'Microsoft YaHei', sans-serif",
                    value: pendingCustomVal,
                    onChange: handleCustomChange,
                    style: customInputStyle
                  })
                ]) : null,
                // 字号选择
                R.createElement("div", { key: "size", style: rowStyle }, [
                  R.createElement("span", { style: labelStyle },
                    "字号",
                    R.createElement("span", { style: hintStyle }, "调整聊天内容区域字号（默认 14px）")
                  ),
                  R.createElement("div", { style: { display: "flex", gap: "4px", alignItems: "center" } }, [
                    R.createElement("button", {
                      type: "button",
                      style: btnSquareStyle,
                      onClick: decreaseSize
                    }, "-"),
                    R.createElement("input", {
                      type: "number",
                      min: 10,
                      max: 24,
                      step: 1,
                      value: pendingFontSize,
                      onChange: handleSizeChange,
                      style: numberInputStyle
                    }),
                    R.createElement("button", {
                      type: "button",
                      style: btnSquareStyle,
                      onClick: increaseSize
                    }, "+"),
                    R.createElement("span", {
                      style: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary)", marginLeft: "2px" }
                    }, "px")
                  ])
                ]),
                // 分隔线
                R.createElement("div", { key: "section1", style: { height: "1px", background: "var(--dsw-alias-border-l1)", margin: "6px 0" } }),
                // 代码字体选择
                R.createElement("div", { key: "code-family", style: rowStyle }, [
                  R.createElement("span", { style: labelStyle },
                    "代码字体",
                    R.createElement("span", { style: hintStyle }, "选择等宽字体，字号跟随界面设置")
                  ),
                  R.createElement("select", {
                    style: selectStyle,
                    value: pendingCodeId,
                    onChange: handleCodeFamilyChange
                  }, CODE_FONTS.map(function (f) {
                    return R.createElement("option", { key: f.id, value: f.id }, f.label);
                  }))
                ]),
                // 代码字体自定义输入
                isCodeCustom ? R.createElement("div", { key: "code-custom", style: { padding: "0 0 4px" } }, [
                  R.createElement("input", {
                    type: "text",
                    placeholder: "例如: 'Fira Code', Consolas, monospace",
                    value: pendingCodeCustom,
                    onChange: handleCodeCustomChange,
                    style: customInputStyle
                  })
                ]) : null,
                // 分隔线
                R.createElement("div", { key: "section2", style: { height: "1px", background: "var(--dsw-alias-border-l1)", margin: "6px 0" } }),
                // 回滚字体选择
                R.createElement("div", { key: "roll-family", style: rowStyle }, [
                  R.createElement("span", { style: labelStyle },
                    "回滚字体",
                    R.createElement("span", { style: hintStyle }, "主字体缺字时兜底显示，不选则不追加")
                  ),
                  R.createElement("select", {
                    style: selectStyle,
                    value: pendingRollId,
                    onChange: handleRollFamilyChange
                  }, FONT_PRESETS.map(function (f) {
                    return R.createElement("option", { key: f.id, value: f.id }, f.label);
                  }))
                ]),
                // 回滚字体自定义输入
                isRollCustom ? R.createElement("div", { key: "roll-custom", style: { padding: "0 0 4px" } }, [
                  R.createElement("input", {
                    type: "text",
                    placeholder: "例如: 'PingFang SC', 'Microsoft YaHei', sans-serif",
                    value: pendingRollCustom,
                    onChange: handleRollCustomChange,
                    style: customInputStyle
                  })
                ]) : null,
                // 字体预览
                R.createElement("div", { key: "preview-label", style: { padding: "8px 0 2px", fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" } },
                  "预览效果（" + previewLabel + "，" + pendingFontSize + "px）："
                ),
                R.createElement("div", { key: "preview", style: { padding: "0 0 8px" } }, [
                  R.createElement("div", { style: previewExampleStyle },
                    "这是示例文字，预览当前选择的字体和字号效果。The quick brown fox jumps over the lazy dog. 天地玄黄，宇宙洪荒。"
                  )
                ]),
                // 代码字体预览
                R.createElement("div", { key: "code-preview-label", style: { padding: "8px 0 2px", fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" } },
                  "代码字体预览（" + previewCodeLabel + "）："
                ),
                R.createElement("div", { key: "code-preview", style: { padding: "0 0 12px" } }, [
                  R.createElement("div", { style: codePreviewStyle },
                    "def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a"
                  )
                ]),
                // 操作按钮
                R.createElement("div", { key: "actions", style: { display: "flex", gap: "8px", alignItems: "center", padding: "4px 0" } }, [
                  hasChanges ? R.createElement("button", {
                    key: "save",
                    type: "button",
                    style: {
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 20px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "var(--dsw-alias-state-business-primary, #4f6ef7)",
                      color: "#fff",
                      cursor: "pointer"
                    },
                    onClick: handleSave
                  }, "保存设置") : null,
                  hasChanges ? R.createElement("button", {
                    key: "discard",
                    type: "button",
                    style: {
                      border: "1px solid var(--dsw-alias-border-l2)",
                      borderRadius: "6px",
                      padding: "6px 16px",
                      fontSize: "13px",
                      background: "transparent",
                      color: "var(--dsw-alias-label-secondary)",
                      cursor: "pointer"
                    },
                    onClick: handleDiscard
                  }, "放弃修改") : null,
                  R.createElement("button", {
                    key: "reset",
                    type: "button",
                    style: {
                      border: "1px solid var(--dsw-alias-border-l2)",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      background: "transparent",
                      color: "var(--dsw-alias-label-tertiary)",
                      cursor: "pointer",
                      marginLeft: hasChanges ? "auto" : "0"
                    },
                    onClick: handleReset
                  }, "恢复默认设置")
                ])
              ]);
            }
          );
          disposeRows.push(d);
          return d;
        });
      }

      // 清理
      ctx.effect(function () {
        return function () {
          disposeSettings();
        };
      });
    }

    module.exports = { apply: apply };
    return module.exports;
  }
});