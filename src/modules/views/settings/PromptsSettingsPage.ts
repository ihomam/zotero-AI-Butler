/**
 * Prompts管理页
 *
 * @file PromptsSettingsPage.ts
 */

import { getPref, setPref, clearPref } from "../../../utils/prefs";
import {
  getDefaultSummaryPrompt,
  getDefaultTableTemplate,
  getDefaultTableFillPrompt,
  getDefaultTableReviewPrompt,
  PROMPT_VERSION,
  parseMultiRoundPrompts,
  getDefaultMultiRoundPrompts,
  getDefaultMultiRoundFinalPrompt,
  type MultiRoundPromptItem,
  type SummaryMode,
} from "../../../utils/prompts";
import {
  createFormGroup,
  createInput,
  createTextarea,
  createSelect,
  createStyledButton,
  createSectionTitle,
  createNotice,
  createCheckbox,
} from "../ui/components";

type PresetMap = Record<string, string>;

export class PromptsSettingsPage {
  private container: HTMLElement;

  // UI refs
  private presetSelect!: HTMLElement; // 自定义下拉框
  private editor!: HTMLTextAreaElement;
  private previewBox!: HTMLElement;
  private sampleTitle!: HTMLInputElement;
  private sampleAuthors!: HTMLInputElement;
  private sampleYear!: HTMLInputElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = "";

    // 内容包装器 - 限制最大宽度，防止内容撑开容器
    const contentWrapper = Zotero.getMainWindow().document.createElement("div");
    Object.assign(contentWrapper.style, {
      maxWidth: "680px",
      width: "100%",
    });
    this.container.appendChild(contentWrapper);

    // Title
    const title = Zotero.getMainWindow().document.createElement("h2");
    title.textContent = "📝 Prompt Templates";
    Object.assign(title.style, {
      color: "#59c0bc",
      marginBottom: "20px",
      fontSize: "20px",
      borderBottom: "2px solid #59c0bc",
      paddingBottom: "10px",
    });
    contentWrapper.appendChild(title);

    contentWrapper.appendChild(
      createNotice(
        "Tip: supports preset templates, custom editing, and variable interpolation preview. Available variables: <code>${title}</code>, <code>${authors}</code>, <code>${year}</code>.",
        "info",
      ),
    );

    // =========== 总结模式选择区域 ===========
    const modeSection = Zotero.getMainWindow().document.createElement("div");
    Object.assign(modeSection.style, {
      marginBottom: "24px",
      padding: "16px",
      background: "var(--ai-input-bg)",
      borderRadius: "8px",
      border: "1px solid var(--ai-input-border)",
    });

    const modeTitle = Zotero.getMainWindow().document.createElement("h3");
    modeTitle.textContent = "🔄 Summary Mode";
    Object.assign(modeTitle.style, {
      color: "#59c0bc",
      marginBottom: "12px",
      fontSize: "16px",
    });
    modeSection.appendChild(modeTitle);

    // 模式说明
    modeSection.appendChild(
      createNotice(
        "Choose how AI summarizes papers:<br/>" +
          "• <b>Single Conversation</b>: complete the summary in one conversation (lowest token usage, concise notes)<br/>" +
          "• <b>Multi-turn Concatenation</b>: concatenate all content after multiple rounds (higher token usage, most detailed notes)<br/>" +
          "• <b>Multi-turn Summarization</b>: let AI summarize after multiple rounds (highest token usage, detailed but balanced notes)",
        "info",
      ),
    );

    // 模式选择
    const currentMode = ((getPref("summaryMode" as any) as string) ||
      "single") as SummaryMode;
    const modeOptions = [
      { value: "single", label: "📝 Single Conversation (Default)" },
      { value: "multi_concat", label: "📚 Multi-turn Concatenation" },
      { value: "multi_summarize", label: "✨ Multi-turn Summarization" },
    ];

    const modeSelect = createSelect(
      "summary-mode",
      modeOptions,
      currentMode,
      (newValue) => {
        setPref("summaryMode" as any, newValue as any);
        this.updateMultiRoundVisibility(newValue as SummaryMode);
        new ztoolkit.ProgressWindow("Prompts")
          .createLine({
            text: `Switched to: ${modeOptions.find((o) => o.value === newValue)?.label}`,
            type: "success",
          })
          .show();
      },
    );
    modeSection.appendChild(
      createFormGroup(
        "Select mode",
        modeSelect,
        "Changes take effect immediately",
      ),
    );

    // 多轮设置容器（根据模式显示/隐藏）
    const multiRoundContainer =
      Zotero.getMainWindow().document.createElement("div");
    multiRoundContainer.id = "multi-round-settings";
    Object.assign(multiRoundContainer.style, {
      marginTop: "16px",
      display: currentMode === "single" ? "none" : "block",
    });

    // 多轮PromptsEdit区
    const multiRoundTitle = Zotero.getMainWindow().document.createElement("h4");
    multiRoundTitle.textContent = "📋 Multi-round Prompt Settings";
    Object.assign(multiRoundTitle.style, {
      color: "#59c0bc",
      marginBottom: "12px",
      fontSize: "14px",
    });
    multiRoundContainer.appendChild(multiRoundTitle);

    // 当前多轮Prompts列表
    const promptsJson = (getPref("multiRoundPrompts" as any) as string) || "[]";
    const prompts = parseMultiRoundPrompts(promptsJson);

    const promptsList = Zotero.getMainWindow().document.createElement("div");
    promptsList.id = "multi-round-prompts-list";
    Object.assign(promptsList.style, {
      maxHeight: "200px",
      overflowY: "auto",
      marginBottom: "12px",
    });

    this.renderMultiRoundPromptsList(promptsList, prompts);
    multiRoundContainer.appendChild(promptsList);

    // 多轮Prompts操作按钮
    const promptsBtnRow = Zotero.getMainWindow().document.createElement("div");
    Object.assign(promptsBtnRow.style, {
      display: "flex",
      gap: "8px",
      marginBottom: "12px",
    });

    const btnAddPrompt = createStyledButton("➕ Add Prompt", "#4caf50");
    btnAddPrompt.addEventListener("click", () => this.addMultiRoundPrompt());
    const btnResetPrompts = createStyledButton(
      "🔄 Restore Defaults",
      "#9e9e9e",
    );
    btnResetPrompts.addEventListener("click", () =>
      this.resetMultiRoundPrompts(),
    );

    promptsBtnRow.appendChild(btnAddPrompt);
    promptsBtnRow.appendChild(btnResetPrompts);
    multiRoundContainer.appendChild(promptsBtnRow);

    // Final Summary Prompt（仅多轮总结模式显示）
    const finalPromptContainer =
      Zotero.getMainWindow().document.createElement("div");
    finalPromptContainer.id = "final-prompt-container";
    Object.assign(finalPromptContainer.style, {
      display: currentMode === "multi_summarize" ? "block" : "none",
      marginTop: "12px",
    });

    const finalPromptTitle =
      Zotero.getMainWindow().document.createElement("h4");
    finalPromptTitle.textContent = "📝 Final Summary Prompt";
    Object.assign(finalPromptTitle.style, {
      color: "#59c0bc",
      marginBottom: "8px",
      fontSize: "14px",
    });
    finalPromptContainer.appendChild(finalPromptTitle);

    const currentFinalPrompt =
      (getPref("multiRoundFinalPrompt" as any) as string) ||
      getDefaultMultiRoundFinalPrompt();
    const finalPromptEditor = createTextarea(
      "final-prompt-editor",
      currentFinalPrompt,
      6,
      "Enter the final summary prompt...",
    );
    finalPromptEditor.addEventListener("change", () => {
      setPref("multiRoundFinalPrompt" as any, finalPromptEditor.value as any);
    });
    finalPromptContainer.appendChild(
      createFormGroup(
        "Final Summary Prompt",
        finalPromptEditor,
        "After the multi-round conversation is complete, use this prompt to generate the final summary.",
      ),
    );

    // Save intermediate conversation content选项
    const saveIntermediate =
      (getPref("multiSummarySaveIntermediate" as any) as boolean) ?? false;
    const saveIntermediateCheckbox = createCheckbox(
      "save-intermediate",
      saveIntermediate,
    );
    saveIntermediateCheckbox.addEventListener("click", () => {
      const checkbox = saveIntermediateCheckbox.querySelector(
        "input",
      ) as HTMLInputElement;
      if (checkbox) {
        setPref("multiSummarySaveIntermediate" as any, checkbox.checked as any);
        new ztoolkit.ProgressWindow("Prompts")
          .createLine({
            text: checkbox.checked
              ? "✅ Intermediate conversation content will be saved"
              : "ℹ️ Only the final summary will be saved",
            type: "success",
          })
          .show();
      }
    });
    finalPromptContainer.appendChild(
      createFormGroup(
        "Save intermediate conversation content",
        saveIntermediateCheckbox,
        "When enabled, notes will include the multi-round conversation and the final summary.",
      ),
    );

    multiRoundContainer.appendChild(finalPromptContainer);
    modeSection.appendChild(multiRoundContainer);
    contentWrapper.appendChild(modeSection);

    // =========== 原有的Single-round Prompt Settings ===========
    // 左右布局
    const layout = Zotero.getMainWindow().document.createElement("div");
    layout.id = "single-round-settings";
    Object.assign(layout.style, {
      display: currentMode === "single" ? "grid" : "none",
      gridTemplateColumns: "minmax(280px, 340px) 1fr",
      gap: "20px",
      alignItems: "start",
    });
    contentWrapper.appendChild(layout);

    // 左侧: 模板选择与示例变量
    const left = Zotero.getMainWindow().document.createElement("div");
    layout.appendChild(left);

    // 预设选择
    const presets = this.getAllPresets();
    const currentPrompt =
      (getPref("summaryPrompt") as string) || getDefaultSummaryPrompt();
    const presetOptions = Object.keys(presets).map((name) => ({
      value: name,
      label: name,
    }));
    this.presetSelect = createSelect(
      "prompt-preset",
      presetOptions,
      this.detectPresetName(currentPrompt, presets),
      (newValue) => {
        // 当下拉框值改变时，自动加载预设到Edit器
        this.loadPresetToEditor();
      },
    ) as any;
    left.appendChild(
      createFormGroup(
        "Choose Preset",
        this.presetSelect,
        "After selecting a preset, you can review and edit it in the editor on the right.",
      ),
    );

    // 预设按钮 - 竖向布局，避免文字溢出
    const presetBtnCol = Zotero.getMainWindow().document.createElement("div");
    Object.assign(presetBtnCol.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      marginBottom: "16px",
    });

    const btnApplyPreset = createStyledButton("📋 Apply Preset", "#2196f3");
    Object.assign(btnApplyPreset.style, {
      width: "100%",
      padding: "12px 20px",
      fontSize: "14px",
    });
    btnApplyPreset.addEventListener("click", () => this.loadPresetToEditor());

    const btnSaveAsPreset = createStyledButton(
      "💾 Save as New Preset",
      "#4caf50",
    );
    Object.assign(btnSaveAsPreset.style, {
      width: "100%",
      padding: "12px 20px",
      fontSize: "14px",
    });
    btnSaveAsPreset.addEventListener("click", () => this.saveAsPreset());

    const btnDeletePreset = createStyledButton("🗑️ Delete Preset", "#f44336");
    Object.assign(btnDeletePreset.style, {
      width: "100%",
      padding: "12px 20px",
      fontSize: "14px",
    });
    btnDeletePreset.addEventListener("click", () => this.deleteCustomPreset());

    presetBtnCol.appendChild(btnApplyPreset);
    presetBtnCol.appendChild(btnSaveAsPreset);
    presetBtnCol.appendChild(btnDeletePreset);
    left.appendChild(presetBtnCol);

    // 示例变量输入
    left.appendChild(createSectionTitle("Sample Metadata (for Preview)"));
    this.sampleTitle = createInput(
      "sample-title",
      "text",
      "A Great Paper",
      "Paper Title",
    );
    left.appendChild(createFormGroup("Title", this.sampleTitle));
    this.sampleAuthors = createInput(
      "sample-authors",
      "text",
      "Alice; Bob",
      "Authors, separated by semicolons",
    );
    left.appendChild(createFormGroup("Authors", this.sampleAuthors));
    this.sampleYear = createInput("sample-year", "text", "2024", "Year");
    left.appendChild(createFormGroup("Year", this.sampleYear));

    // 右侧: Edit器 + 操作 + 预览
    const right = Zotero.getMainWindow().document.createElement("div");
    layout.appendChild(right);

    this.editor = createTextarea(
      "prompt-editor",
      currentPrompt,
      18,
      "Edit the prompt template here...",
    );
    right.appendChild(
      createFormGroup(
        "Template Editor",
        this.editor,
        "Editable directly; supports variables ${title}/${authors}/${year}",
      ),
    );

    // 操作按钮
    const actionRow = Zotero.getMainWindow().document.createElement("div");
    Object.assign(actionRow.style, {
      display: "flex",
      gap: "12px",
      marginTop: "8px",
      marginBottom: "16px",
    });
    const btnSave = createStyledButton("💾 Save", "#4caf50");
    btnSave.addEventListener("click", () => this.saveCurrent());
    const btnReset = createStyledButton("🔄 Restore", "#9e9e9e");
    btnReset.addEventListener("click", () => this.resetDefault());
    const btnPreview = createStyledButton("👁️ Preview", "#2196f3");
    btnPreview.addEventListener("click", () => this.updatePreview());
    actionRow.appendChild(btnSave);
    actionRow.appendChild(btnReset);
    actionRow.appendChild(btnPreview);
    right.appendChild(actionRow);

    // 预览框：改为与Template Editor风格一致，适配明暗主题
    this.previewBox = Zotero.getMainWindow().document.createElement("div");
    Object.assign(this.previewBox.style, {
      border: "1px dashed var(--ai-input-border)",
      borderRadius: "6px",
      padding: "12px",
      background: "var(--ai-input-bg)",
      color: "var(--ai-input-text)",
      whiteSpace: "pre-wrap",
      fontFamily: "Consolas, Menlo, monospace",
      lineHeight: "1.5",
      minHeight: "120px",
    });
    right.appendChild(
      createFormGroup(
        "Interpolation Preview",
        this.previewBox,
        "Shows a preview of the request content after variable substitution.",
      ),
    );

    // 初次渲染时也做一次预览
    this.updatePreview();

    // =========== 文献综述表格设置 ===========
    this.renderTableSettings(contentWrapper);
  }

  // ===== helpers =====
  private getAllPresets(): PresetMap {
    const builtins: PresetMap = {
      "Default Template": getDefaultSummaryPrompt(),
      "Concise Summary": `你是一名学术助手。请用中文以简洁的要点方式总结论文主要问题、方法、关键结果与结论。文章信息: Title=${"${title}"}; Authors=${"${authors}"}; Year=${"${year}"}`,
      "Structured Report": `请以"背景/方法/结果/讨论/局限/结论"六部分结构化总结论文; 开头写:《${"${title}"}》(${" ${year} "}).`,
      "Computer Science Default": `帮我用中文讲一下这篇计算机领域的论文，讲的越详细越好，我有通用计算机专业基础，但是没有这个小方向的基础。输出的时候只包含关于论文的讲解，不要包含寒暄的内容。开始时先用一段话总结这篇论文的核心内容。`,
    };

    // 自定义预设
    const custom: PresetMap = {};
    try {
      const raw = (getPref("customPrompts") as string) || "";
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        // 过滤掉空值，防止 null/undefined
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === "string") {
            custom[k] = v;
          }
        });
      }
    } catch (e) {
      ztoolkit.log("[PromptsSettings] Failed to parse customPrompts:", e);
    }

    return { ...builtins, ...custom };
  }

  private detectPresetName(current: string, presets: PresetMap): string {
    // 防止 null/undefined 值导致错误
    if (!current) return "Default Template";
    const entry = Object.entries(presets).find(([, v]) => {
      return v && typeof v === "string" && v.trim() === current.trim();
    });
    return entry ? entry[0] : "Default Template";
  }

  private loadPresetToEditor(): void {
    const name = (this.presetSelect as any).getValue();
    const presets = this.getAllPresets();
    const tpl = presets[name];
    if (tpl && typeof tpl === "string") {
      this.editor.value = tpl;
      setPref("summaryPrompt", tpl); // 保存到配置，确保立即生效
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({
          text: `Applied and saved preset: ${name}`,
          type: "success",
        })
        .show();
      this.updatePreview();
    } else {
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({
          text: "The preset template is empty or invalid",
          type: "fail",
        })
        .show();
    }
  }

  private saveAsPreset(): void {
    const win = Zotero.getMainWindow() as any;
    const name = { value: "" } as any;
    const ok = Services.prompt.prompt(
      win,
      "Save as New Preset",
      "Enter a preset name:",
      name,
      "",
      { value: false },
    );
    if (!ok || !name.value || !name.value.trim()) return;

    const presetName = name.value.trim();
    const editorValue = this.editor.value || "";

    if (!editorValue.trim()) {
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({ text: "❌ Template content is empty", type: "fail" })
        .show();
      return;
    }

    const custom: PresetMap = {};
    try {
      const raw = (getPref("customPrompts") as string) || "";
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        // 过滤空值
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === "string") custom[k] = v;
        });
      }
    } catch (e) {
      ztoolkit.log("[PromptsSettings] Failed to parse customPrompts:", e);
    }

    custom[presetName] = editorValue;
    setPref("customPrompts", JSON.stringify(custom));

    // 重新渲染整个页面来更新下拉框选项
    this.render();

    // 设置下拉框为新保存的预设
    setTimeout(() => {
      (this.presetSelect as any).setValue(presetName);
    }, 0);

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({ text: `✅ Preset saved: ${presetName}`, type: "success" })
      .show();
  }

  private deleteCustomPreset(): void {
    const name = (this.presetSelect as any).getValue();
    // 只允许Delete自定义的(避免删内置)
    const custom: PresetMap = {};
    try {
      const raw = (getPref("customPrompts") as string) || "";
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === "string") custom[k] = v;
        });
      }
    } catch (e) {
      ztoolkit.log("[PromptsSettings] Failed to parse customPrompts:", e);
    }

    if (!(name in custom)) {
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({
          text: "Only custom presets can be deleted",
          type: "default",
        })
        .show();
      return;
    }
    const ok = Services.prompt.confirm(
      Zotero.getMainWindow() as any,
      "Delete Preset",
      `Delete custom preset: ${name} ?`,
    );
    if (!ok) return;
    delete custom[name];
    setPref("customPrompts", JSON.stringify(custom));

    // 重新渲染整个页面来更新下拉框选项（与 saveAsPreset 一致）
    this.render();

    // 设置下拉框为Default Template
    setTimeout(() => {
      (this.presetSelect as any).setValue("Default Template");
    }, 0);

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({ text: `✅ Deleted preset: ${name}`, type: "success" })
      .show();
  }

  private saveCurrent(): void {
    const text = this.editor.value || getDefaultSummaryPrompt();
    setPref("summaryPrompt", text);

    // 获取当前选中的预设名
    const currentPresetName = (this.presetSelect as any).getValue();

    // 检查是否是自定义预设，如果是则同时更新
    const custom: PresetMap = {};
    try {
      const raw = (getPref("customPrompts") as string) || "";
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === "string") custom[k] = v;
        });
      }
    } catch (e) {
      ztoolkit.log("[PromptsSettings] Failed to parse customPrompts:", e);
    }

    if (currentPresetName in custom) {
      // 更新自定义预设
      custom[currentPresetName] = text;
      setPref("customPrompts", JSON.stringify(custom));
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({
          text: `✅ Preset “${currentPresetName}” updated`,
          type: "success",
        })
        .show();
    } else {
      // 内置预设，仅保存到 summaryPrompt
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({ text: "✅ Current template saved", type: "success" })
        .show();
    }
  }

  private resetDefault(): void {
    const ok = Services.prompt.confirm(
      Zotero.getMainWindow() as any,
      "Restore Defaults",
      "Restore the template to its default value?",
    );
    if (!ok) return;
    const def = getDefaultSummaryPrompt();
    setPref("summaryPrompt", def);
    setPref("promptVersion" as any, PROMPT_VERSION as any);
    this.editor.value = def;
    this.updatePreview();
    new ztoolkit.ProgressWindow("Prompts")
      .createLine({ text: "Restored the default template", type: "success" })
      .show();
  }

  private updatePreview(): void {
    const vars = {
      title: this.sampleTitle?.value || "(Sample Title)",
      authors: this.sampleAuthors?.value || "(Sample Authors)",
      year: this.sampleYear?.value || "(Year)",
    };
    const content = this.interpolate(this.editor.value || "", vars);
    this.previewBox.textContent = content.substring(0, 2000);
  }

  private interpolate(tpl: string, vars: Record<string, string>): string {
    return tpl.replace(
      /\$\{(title|authors|year)\}/g,
      (_, k) => vars[k as keyof typeof vars] || "",
    );
  }

  // =========== 多轮Prompts相关方法 ===========

  /**
   * 根据总结模式更新多轮设置区域的可见性
   */
  private updateMultiRoundVisibility(mode: SummaryMode): void {
    const multiRoundSettings = this.container.querySelector(
      "#multi-round-settings",
    ) as HTMLElement;
    const finalPromptContainer = this.container.querySelector(
      "#final-prompt-container",
    ) as HTMLElement;
    const singleRoundSettings = this.container.querySelector(
      "#single-round-settings",
    ) as HTMLElement;

    if (multiRoundSettings) {
      multiRoundSettings.style.display = mode === "single" ? "none" : "block";
    }
    if (finalPromptContainer) {
      finalPromptContainer.style.display =
        mode === "multi_summarize" ? "block" : "none";
    }
    // 单次对话模式下显示预设模板区域，多轮模式下隐藏
    if (singleRoundSettings) {
      singleRoundSettings.style.display = mode === "single" ? "grid" : "none";
    }
  }

  /**
   * 渲染多轮Prompts列表
   */
  private renderMultiRoundPromptsList(
    container: HTMLElement,
    prompts: MultiRoundPromptItem[],
  ): void {
    container.innerHTML = "";

    if (prompts.length === 0) {
      const empty = Zotero.getMainWindow().document.createElement("div");
      empty.textContent =
        "No multi-round prompts yet. Add one or restore the defaults.";
      Object.assign(empty.style, {
        color: "var(--ai-text-secondary)",
        padding: "12px",
        textAlign: "center",
      });
      container.appendChild(empty);
      return;
    }

    prompts.forEach((prompt, index) => {
      const item = Zotero.getMainWindow().document.createElement("div");
      Object.assign(item.style, {
        display: "flex",
        alignItems: "center",
        padding: "8px",
        marginBottom: "4px",
        background: "var(--ai-card-bg)",
        borderRadius: "4px",
        border: "1px solid var(--ai-input-border)",
        minWidth: "0", // 防止flex子元素撑开容器
        overflow: "hidden", // 确保内容不溢出
      });

      const orderBadge = Zotero.getMainWindow().document.createElement("span");
      orderBadge.textContent = `${index + 1}`;
      Object.assign(orderBadge.style, {
        background: "#59c0bc",
        color: "white",
        borderRadius: "50%",
        width: "24px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginRight: "10px",
        fontSize: "12px",
        fontWeight: "bold",
      });
      item.appendChild(orderBadge);

      const info = Zotero.getMainWindow().document.createElement("div");
      Object.assign(info.style, {
        flex: "1",
        overflow: "hidden",
      });

      const title = Zotero.getMainWindow().document.createElement("div");
      title.textContent = prompt.title;
      Object.assign(title.style, {
        fontWeight: "bold",
        color: "var(--ai-text-primary)",
        marginBottom: "2px",
      });
      info.appendChild(title);

      const preview = Zotero.getMainWindow().document.createElement("div");
      preview.textContent =
        prompt.prompt.substring(0, 50) +
        (prompt.prompt.length > 50 ? "..." : "");
      Object.assign(preview.style, {
        fontSize: "12px",
        color: "var(--ai-text-secondary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      info.appendChild(preview);

      item.appendChild(info);

      // Edit按钮
      const btnEdit = Zotero.getMainWindow().document.createElement("button");
      btnEdit.textContent = "✏️";
      btnEdit.title = "Edit";
      Object.assign(btnEdit.style, {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "16px",
        padding: "4px 8px",
      });
      btnEdit.addEventListener("click", () =>
        this.editMultiRoundPrompt(prompt.id),
      );
      item.appendChild(btnEdit);

      // Delete按钮
      const btnDelete = Zotero.getMainWindow().document.createElement("button");
      btnDelete.textContent = "🗑️";
      btnDelete.title = "Delete";
      Object.assign(btnDelete.style, {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "16px",
        padding: "4px 8px",
      });
      btnDelete.addEventListener("click", () =>
        this.deleteMultiRoundPrompt(prompt.id),
      );
      item.appendChild(btnDelete);

      container.appendChild(item);
    });
  }

  /**
   * 添加新的多轮Prompts
   */
  private addMultiRoundPrompt(): void {
    const win = Zotero.getMainWindow() as any;

    // 输入Title
    const titleObj = { value: "" } as any;
    const ok1 = Services.prompt.prompt(
      win,
      "Add Multi-round Prompt",
      "Enter the prompt title:",
      titleObj,
      "",
      { value: false },
    );
    if (!ok1 || !titleObj.value?.trim()) return;

    // 输入内容
    const promptObj = { value: "" } as any;
    const ok2 = Services.prompt.prompt(
      win,
      "Add Multi-round Prompt",
      "Enter the prompt content:",
      promptObj,
      "",
      { value: false },
    );
    if (!ok2 || !promptObj.value?.trim()) return;

    const promptsJson = (getPref("multiRoundPrompts" as any) as string) || "[]";
    const prompts = parseMultiRoundPrompts(promptsJson);

    const newPrompt: MultiRoundPromptItem = {
      id: `round_${Date.now()}`,
      title: titleObj.value.trim(),
      prompt: promptObj.value.trim(),
      order: prompts.length + 1,
    };

    prompts.push(newPrompt);
    setPref("multiRoundPrompts" as any, JSON.stringify(prompts) as any);

    // 刷新列表
    const list = this.container.querySelector(
      "#multi-round-prompts-list",
    ) as HTMLElement;
    if (list) {
      this.renderMultiRoundPromptsList(list, prompts);
    }

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({ text: `✅ Added: ${newPrompt.title}`, type: "success" })
      .show();
  }

  /**
   * Edit多轮Prompts
   */
  private editMultiRoundPrompt(id: string): void {
    const win = Zotero.getMainWindow() as any;
    const promptsJson = (getPref("multiRoundPrompts" as any) as string) || "[]";
    const prompts = parseMultiRoundPrompts(promptsJson);
    const index = prompts.findIndex((p) => p.id === id);

    if (index === -1) return;

    const current = prompts[index];

    // EditTitle
    const titleObj = { value: current.title } as any;
    const ok1 = Services.prompt.prompt(
      win,
      "Edit Prompt ",
      "Title:",
      titleObj,
      "",
      { value: false },
    );
    if (!ok1) return;

    // Edit内容
    const promptObj = { value: current.prompt } as any;
    const ok2 = Services.prompt.prompt(
      win,
      "Edit Prompt ",
      "Content:",
      promptObj,
      "",
      { value: false },
    );
    if (!ok2) return;

    prompts[index] = {
      ...current,
      title: titleObj.value?.trim() || current.title,
      prompt: promptObj.value?.trim() || current.prompt,
    };

    setPref("multiRoundPrompts" as any, JSON.stringify(prompts) as any);

    const list = this.container.querySelector(
      "#multi-round-prompts-list",
    ) as HTMLElement;
    if (list) {
      this.renderMultiRoundPromptsList(list, prompts);
    }

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({
        text: `✅ Updated: ${prompts[index].title}`,
        type: "success",
      })
      .show();
  }

  /**
   * Delete多轮Prompts
   */
  private deleteMultiRoundPrompt(id: string): void {
    const win = Zotero.getMainWindow() as any;
    const promptsJson = (getPref("multiRoundPrompts" as any) as string) || "[]";
    const prompts = parseMultiRoundPrompts(promptsJson);
    const index = prompts.findIndex((p) => p.id === id);

    if (index === -1) return;

    const ok = Services.prompt.confirm(
      win,
      "DeletePrompts",
      `Delete “${prompts[index].title}”?`,
    );
    if (!ok) return;

    prompts.splice(index, 1);
    // 重新排序
    prompts.forEach((p, i) => (p.order = i + 1));

    setPref("multiRoundPrompts" as any, JSON.stringify(prompts) as any);

    const list = this.container.querySelector(
      "#multi-round-prompts-list",
    ) as HTMLElement;
    if (list) {
      this.renderMultiRoundPromptsList(list, prompts);
    }

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({ text: "✅ Deleted", type: "success" })
      .show();
  }

  /**
   * Restore Defaults的多轮Prompts
   */
  private resetMultiRoundPrompts(): void {
    const ok = Services.prompt.confirm(
      Zotero.getMainWindow() as any,
      "Restore Defaults",
      "Restore the multi-round prompts to their default settings?",
    );
    if (!ok) return;

    const defaults = getDefaultMultiRoundPrompts();
    setPref("multiRoundPrompts" as any, JSON.stringify(defaults) as any);
    setPref(
      "multiRoundFinalPrompt" as any,
      getDefaultMultiRoundFinalPrompt() as any,
    );

    const list = this.container.querySelector(
      "#multi-round-prompts-list",
    ) as HTMLElement;
    if (list) {
      this.renderMultiRoundPromptsList(list, defaults);
    }

    new ztoolkit.ProgressWindow("Prompts")
      .createLine({
        text: "✅ Restored default multi-round prompts",
        type: "success",
      })
      .show();
  }

  // =========== 文献综述表格设置 ===========

  /**
   * 渲染文献综述表格设置区域
   */
  private renderTableSettings(contentWrapper: HTMLElement): void {
    const doc = Zotero.getMainWindow().document;

    contentWrapper.appendChild(
      createSectionTitle("📊 Literature Review Table Settings"),
    );

    contentWrapper.appendChild(
      createNotice(
        "Configure the table template and prompts for literature reviews. Workflow: fill the table for each paper first, then summarize the combined table into a review.",
        "info",
      ),
    );

    const tableSection = doc.createElement("div");
    Object.assign(tableSection.style, {
      padding: "16px",
      background: "var(--ai-input-bg)",
      borderRadius: "8px",
      border: "1px solid var(--ai-input-border)",
      marginBottom: "24px",
    });

    // 1. 表格模板Edit
    const currentTemplate =
      (getPref("tableTemplate" as any) as string) || getDefaultTableTemplate();
    const templateEditor = createTextarea(
      "table-template-editor",
      currentTemplate,
      10,
      "Enter a Markdown table template...",
    );
    tableSection.appendChild(
      createFormGroup(
        "Table Template (Markdown)",
        templateEditor,
        "Define the structured dimensions to fill in for each paper.",
      ),
    );

    // 2. 填表Prompts
    const currentFillPrompt =
      (getPref("tableFillPrompt" as any) as string) ||
      getDefaultTableFillPrompt();
    const fillPromptEditor = createTextarea(
      "table-fill-prompt-editor",
      currentFillPrompt,
      8,
      "Enter the prompt for filling the table for each paper...",
    );
    tableSection.appendChild(
      createFormGroup(
        "Per-paper Table-fill Prompt",
        fillPromptEditor,
        "Guide the LLM to read a single paper and fill out the table. Available variable: ${tableTemplate}",
      ),
    );

    // 3. Summary Review Prompt
    const currentReviewPrompt =
      (getPref("tableReviewPrompt" as any) as string) ||
      getDefaultTableReviewPrompt();
    const reviewPromptEditor = createTextarea(
      "table-review-prompt-editor",
      currentReviewPrompt,
      8,
      "Enter the prompt for generating a review from the combined table...",
    );
    tableSection.appendChild(
      createFormGroup(
        "Summary Review Prompt",
        reviewPromptEditor,
        "Generate an integrated literature review based on all table-fill results.",
      ),
    );

    // 4. 单篇笔记时额外填表开关
    const enableTableOnSingle =
      (getPref("enableTableOnSingleNote" as any) as boolean) ?? true;
    const enableTableCheckbox = createCheckbox(
      "enable-table-on-single",
      enableTableOnSingle,
    );
    enableTableCheckbox.addEventListener("click", () => {
      const checkbox = enableTableCheckbox.querySelector(
        "input",
      ) as HTMLInputElement;
      if (checkbox) {
        setPref("enableTableOnSingleNote" as any, checkbox.checked as any);
      }
    });
    tableSection.appendChild(
      createFormGroup(
        "Generate table data while generating notes",
        enableTableCheckbox,
        "When enabled, table data will be generated asynchronously in parallel when creating a note for a single paper.",
      ),
    );

    // 5. 并行任务量控制
    const currentConcurrency =
      (getPref("tableFillConcurrency" as any) as number) || 3;
    const concurrencyInput = createInput(
      "table-fill-concurrency",
      "number",
      String(currentConcurrency),
      "1-10",
    );
    concurrencyInput.min = "1";
    concurrencyInput.max = "10";
    concurrencyInput.style.width = "80px";
    concurrencyInput.addEventListener("change", () => {
      let val = parseInt(concurrencyInput.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 10) val = 10;
      concurrencyInput.value = String(val);
      setPref("tableFillConcurrency" as any, val as any);
    });
    tableSection.appendChild(
      createFormGroup(
        "Parallel Table-fill Tasks",
        concurrencyInput,
        "Maximum number of papers to process in parallel for table filling (1-10).",
      ),
    );

    // 6. 保存 / Restore Defaults 按钮
    const tableBtnRow = doc.createElement("div");
    Object.assign(tableBtnRow.style, {
      display: "flex",
      gap: "12px",
      marginTop: "16px",
    });

    const btnSaveTable = createStyledButton(
      "💾 Save Table Settings",
      "#4caf50",
    );
    btnSaveTable.addEventListener("click", () => {
      setPref("tableTemplate" as any, templateEditor.value as any);
      setPref("tableFillPrompt" as any, fillPromptEditor.value as any);
      setPref("tableReviewPrompt" as any, reviewPromptEditor.value as any);
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({ text: "✅ Table settings saved", type: "success" })
        .show();
    });

    const btnResetTable = createStyledButton("🔄 Restore Defaults", "#9e9e9e");
    btnResetTable.addEventListener("click", () => {
      const ok = Services.prompt.confirm(
        Zotero.getMainWindow() as any,
        "Restore Defaults",
        "Restore the table settings to their defaults?",
      );
      if (!ok) return;
      templateEditor.value = getDefaultTableTemplate();
      fillPromptEditor.value = getDefaultTableFillPrompt();
      reviewPromptEditor.value = getDefaultTableReviewPrompt();
      setPref("tableTemplate" as any, getDefaultTableTemplate() as any);
      setPref("tableFillPrompt" as any, getDefaultTableFillPrompt() as any);
      setPref("tableReviewPrompt" as any, getDefaultTableReviewPrompt() as any);
      setPref("enableTableOnSingleNote" as any, true as any);
      setPref("tableFillConcurrency" as any, 3 as any);
      const checkbox = enableTableCheckbox.querySelector(
        "input",
      ) as HTMLInputElement;
      if (checkbox) checkbox.checked = true;
      concurrencyInput.value = "3";
      new ztoolkit.ProgressWindow("Prompts")
        .createLine({
          text: "✅ Table settings restored to defaults",
          type: "success",
        })
        .show();
    });

    tableBtnRow.appendChild(btnSaveTable);
    tableBtnRow.appendChild(btnResetTable);
    tableSection.appendChild(tableBtnRow);

    contentWrapper.appendChild(tableSection);
  }
}
