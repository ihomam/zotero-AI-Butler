/**
 * 关于页面
 *
 * @file AboutPage.ts
 * @author AI Butler Team
 */

import { version, config, repository } from "../../../../package.json";
import { createCard, createNotice } from "../ui/components";

export class AboutPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = "";

    const doc = Zotero.getMainWindow().document;

    // 标题
    const title = doc.createElement("h2");
    title.textContent = "ℹ️ About";
    Object.assign(title.style, {
      color: "#59c0bc",
      marginBottom: "20px",
      fontSize: "20px",
      borderBottom: "2px solid #59c0bc",
      paddingBottom: "10px",
    });
    this.container.appendChild(title);

    const aboutContent = doc.createElement("div");
    Object.assign(aboutContent.style, {
      padding: "0",
      maxWidth: "800px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    });

    // 项目简介 - 从 README 获取
    const introContent = doc.createElement("div");
    introContent.innerHTML = `
      <blockquote style="margin: 0 0 15px 0; padding: 0; font-style: italic; color: #666; border-left: none;">
        <p style="margin: 5px 0; font-size: 15px;">Downloading papers feels great, until reading time becomes overwhelming.</p>
        <p style="margin: 5px 0; font-size: 15px;">When papers are dense and difficult, let the Butler break them down for you.</p>
      </blockquote>
      <p style="font-size: 14px; color: #666; line-height: 1.8; margin-bottom: 10px;">
        Do papers saved for later end up never being read?
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.8; margin-bottom: 10px;">
        Do long academic papers still feel hard to grasp, even with translation?
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.8; margin-bottom: 10px;">
        No worries — your dedicated AI assistant <strong style="color: #59c0bc;">Zotero-AI-Butler</strong> is here.
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        It is your 24/7 private research assistant: tireless, dependable, and always on call.
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        Just keep adding papers to Zotero as usual and let the Butler handle the heavy lifting.
      </p>
      <p style="font-size: 14px; color: #666; line-height: 1.8;">
        The Butler will automatically read papers closely and turn them into notes so you can understand each one in minutes.
      </p>
    `;
    const introSection = createCard("generic", "", introContent, {
      accentColor: "#59c0bc",
    });
    aboutContent.appendChild(introSection);

    // Core Features
    const featuresSection = createCard("generic", "Core Features");
    const featuresBody = featuresSection.querySelector(
      ".ai-card__body",
    ) as HTMLElement;

    const featuresList = doc.createElement("ol");
    Object.assign(featuresList.style, {
      fontSize: "14px",
      color: "var(--ai-text-muted)",
      lineHeight: "1.8",
      paddingLeft: "20px",
    });

    const features = [
      {
        title: "Automatic Monitoring (Auto Scan)",
        desc: "The Butler quietly watches your library in the background and automatically starts working on newly added papers — or older unread ones — as long as they do not already have notes.",
      },
      {
        title: "Deep Analysis (Generate Notes)",
        desc: "Its core job is to use large language models to deeply analyze each paper and turn it into a clear, structured Markdown note attached to the Zotero item.",
      },
      {
        title: "On-Demand Analysis (Context Menu)",
        desc: "In addition to full automation, you can right-click any paper at any time and ask the Butler to analyze it immediately with top priority.",
      },
      {
        title: "Smart Processing (Lossless Reading)",
        desc: "When the selected model supports multimodal input, the Butler can process PDFs directly without local OCR or text extraction, preserving images, tables, formulas, and other details as accurately as possible.",
      },
    ];

    features.forEach((f) => {
      const li = doc.createElement("li");
      Object.assign(li.style, {
        marginBottom: "10px",
      });
      li.innerHTML = `<strong>${f.title}</strong>: ${f.desc}`;
      featuresList.appendChild(li);
    });

    featuresBody.appendChild(featuresList);

    aboutContent.appendChild(featuresSection);

    // Slogan 单独作为一行 Callout，略微悬浮效果
    const sloganWrapper = doc.createElement("div");
    Object.assign(sloganWrapper.style, {
      display: "flex",
      justifyContent: "center",
      marginTop: "4px",
    });

    const slogan = doc.createElement("div");
    Object.assign(slogan.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "13px",
      color: "var(--ai-text-muted)",
      padding: "8px 14px",
      borderRadius: "999px",
      background:
        "linear-gradient(135deg, rgba(89,192,188,0.14), rgba(89,192,188,0.02))",
      border: "1px solid rgba(89,192,188,0.25)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.24)",
      backdropFilter: "blur(12px)",
      maxWidth: "420px",
      whiteSpace: "nowrap",
    });

    const sloganIcon = doc.createElement("span");
    sloganIcon.textContent = "✨";
    sloganIcon.style.color = "#59c0bc";

    const sloganText = doc.createElement("span");
    sloganText.textContent =
      "You focus on thinking — Zotero-AI-Butler clears the obstacles from your reading.";

    slogan.appendChild(sloganIcon);
    slogan.appendChild(sloganText);
    sloganWrapper.appendChild(slogan);

    aboutContent.appendChild(sloganWrapper);

    // Project Information
    const repoUrl =
      repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") ||
      "https://github.com/steven-jianhao-li/zotero-AI-Butler";

    const infoBody = doc.createElement("div");
    infoBody.innerHTML = `
      <p style="font-size: 14px; color: var(--ai-text-muted); margin: 8px 0;">
        <strong>Name:</strong> ${config.addonName || "Zotero AI Butler"}
      </p>
      <p style="font-size: 14px; color: var(--ai-text-muted); margin: 8px 0;">
        <strong>Version:</strong> ${version || "1.0.0"}
      </p>
      <p style="font-size: 14px; color: var(--ai-text-muted); margin: 8px 0;">
        <strong>Author:</strong> Steven Jianhao Li
      </p>
      <p style="font-size: 14px; color: var(--ai-text-muted); margin: 8px 0;">
        <strong>GitHub:</strong> <a href="${repoUrl}" target="_blank" style="color: #59c0bc; text-decoration: none;">${repoUrl}</a>
      </p>
      <p style="font-size: 14px; color: var(--ai-text-muted); margin: 8px 0;">
        <strong>Issue Tracker:</strong> <a href="${repoUrl}/issues" target="_blank" style="color: #59c0bc; text-decoration: none;">${repoUrl}/issues</a>
      </p>
    `;

    const infoSection = createCard("generic", "Project Information", infoBody);
    aboutContent.appendChild(infoSection);

    // 致谢
    this.container.appendChild(aboutContent);
  }
}
