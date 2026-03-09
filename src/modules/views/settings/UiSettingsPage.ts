/**
 * UI 设置页面
 */

import { getPref, setPref } from "../../../utils/prefs";
import { AutoScanManager } from "../../autoScanManager";
import {
  createFormGroup,
  createSelect,
  createSlider,
  createInput,
  createCheckbox,
  createStyledButton,
  createNotice,
} from "../ui/components";

export class UiSettingsPage {
  private container: HTMLElement;
  private preview!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = "";

    const title = Zotero.getMainWindow().document.createElement("h2");
    title.textContent = "🎨 UI Settings";
    Object.assign(title.style, {
      color: "#59c0bc",
      marginBottom: "20px",
      fontSize: "20px",
      borderBottom: "2px solid #59c0bc",
      paddingBottom: "10px",
    });
    this.container.appendChild(title);

    this.container.appendChild(
      createNotice(
        "UI and behavior settings: auto-scroll, auto-scan, and how to handle existing AI notes.",
      ),
    );

    const form = Zotero.getMainWindow().document.createElement("div");
    Object.assign(form.style, { maxWidth: "820px" });

    // 自动滚动
    const autoScroll = (getPref("autoScroll") as boolean) ?? true;
    const autoScrollBox = createCheckbox("autoScroll", !!autoScroll);
    form.appendChild(
      createFormGroup(
        "Auto-scroll to latest output",
        autoScrollBox,
        "Automatically scroll to the bottom of the output panel while generating notes.",
      ),
    );

    // 自动扫描
    const autoScan = (getPref("autoScan") as boolean) ?? true;
    const autoScanBox = createCheckbox("autoScan", !!autoScan);
    form.appendChild(
      createFormGroup(
        "Auto-scan new papers",
        autoScanBox,
        "Watch library changes and automatically add newly added papers to the analysis queue.",
      ),
    );

    // 保存对话历史
    const saveChatHistory = (getPref("saveChatHistory") as boolean) ?? true;
    const saveChatHistoryBox = createCheckbox(
      "saveChatHistory",
      !!saveChatHistory,
    );
    form.appendChild(
      createFormGroup(
        "Save follow-up chat history",
        saveChatHistoryBox,
        "When enabled, follow-up conversations are automatically saved to the paper's AI Butler note.",
      ),
    );

    // 笔记管理策略
    const policy = (
      (getPref("noteStrategy" as any) as string) || "skip"
    ).toString();
    const policySelect = createSelect(
      "notePolicy",
      [
        { value: "skip", label: "Skip (Default)" },
        { value: "overwrite", label: "Overwrite" },
        { value: "append", label: "Append" },
      ],
      policy,
    );
    form.appendChild(
      createFormGroup(
        "When an AI note already exists",
        policySelect,
        "Choose how to handle items that already have an AI summary note.",
      ),
    );

    // 表格管理策略
    const tablePolicy = (
      (getPref("tableStrategy" as any) as string) || "skip"
    ).toString();
    const tablePolicySelect = createSelect(
      "tablePolicy",
      [
        { value: "skip", label: "Skip (Default)" },
        { value: "overwrite", label: "Overwrite" },
      ],
      tablePolicy,
    );
    form.appendChild(
      createFormGroup(
        "When an AI table already exists",
        tablePolicySelect,
        "Choose how to handle items that already have an AI table note.",
      ),
    );

    // Markdown 笔记样式主题
    const currentTheme = (
      (getPref("markdownTheme" as any) as string) || "github"
    ).toString();
    const themeSelect = createSelect(
      "markdownTheme",
      [
        { value: "github", label: "GitHub (Default)" },
        { value: "redstriking", label: "Redstriking" },
        // 更多主题可在此添加
      ],
      currentTheme,
    );
    form.appendChild(
      createFormGroup(
        "Sidebar note style",
        themeSelect,
        "Set the Markdown rendering style for AI notes in the sidebar.",
      ),
    );

    // 预览区域（移除字号预览，不再提供字体大小设置）

    // 按钮
    const actions = Zotero.getMainWindow().document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      gap: "12px",
      marginTop: "16px",
    });
    const btnSave = createStyledButton("💾 Save Settings", "#4caf50");
    btnSave.addEventListener("click", async () => {
      const autoVal =
        (form.querySelector("#setting-autoScroll") as HTMLInputElement)
          ?.checked ?? true;
      const autoScanVal =
        (form.querySelector("#setting-autoScan") as HTMLInputElement)
          ?.checked ?? true;
      const saveChatHistoryVal =
        (form.querySelector("#setting-saveChatHistory") as HTMLInputElement)
          ?.checked ?? true;
      const policyVal = (policySelect as any).getValue
        ? (policySelect as any).getValue()
        : policy;
      const tablePolicyVal = (tablePolicySelect as any).getValue
        ? (tablePolicySelect as any).getValue()
        : tablePolicy;
      const themeVal = (themeSelect as any).getValue
        ? (themeSelect as any).getValue()
        : currentTheme;

      setPref("autoScroll", !!autoVal as any);
      setPref("autoScan", !!autoScanVal as any);
      setPref("saveChatHistory", !!saveChatHistoryVal as any);
      setPref("noteStrategy" as any, policyVal);
      setPref("tableStrategy" as any, tablePolicyVal);
      setPref("markdownTheme" as any, themeVal);

      // 清除主题缓存以便下次加载新主题
      const { themeManager } = await import("../../themeManager");
      themeManager.setCurrentTheme(themeVal);
      themeManager.clearCache();

      // 重新加载自动扫描管理器
      AutoScanManager.getInstance().reload();

      new ztoolkit.ProgressWindow("UI Settings")
        .createLine({ text: "✅ Settings saved", type: "success" })
        .show();
    });

    const btnReset = createStyledButton("🔄 Reset Defaults", "#9e9e9e");
    btnReset.addEventListener("click", () => {
      setPref("autoScroll", true as any);
      setPref("autoScan", true as any);
      setPref("saveChatHistory", true as any);
      setPref("noteStrategy" as any, "skip");
      setPref("tableStrategy" as any, "skip");
      AutoScanManager.getInstance().reload();
      this.render();
      new ztoolkit.ProgressWindow("UI Settings")
        .createLine({ text: "Reset to defaults", type: "success" })
        .show();
    });
    actions.appendChild(btnSave);
    actions.appendChild(btnReset);
    form.appendChild(actions);

    this.container.appendChild(form);

    // 无字号预览
  }

  private applyPreview(fontSize: number): void {
    if (!this.preview) return;
    this.preview.style.fontSize = `${fontSize}px`;
  }
}
