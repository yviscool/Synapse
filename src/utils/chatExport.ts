import type {
  ChatConversation,
  ExportFormat,
  ExportOptions,
} from "@/types/chat";
import { getMessageContent } from "@/types/chat";
import { resolveLocalePreference } from "@/utils/locale";
import { getPlatformConfig } from "@/content/site-configs";
import i18n from "@/i18n";

type ExportLocaleKey =
  | "zh-CN"
  | "zh-TW"
  | "en"
  | "de"
  | "ja-JP"
  | "ko"
  | "ru-RU";

type ExportLabels = {
  platform: string;
  link: string;
  originalConversation: string;
  collectedAt: string;
  messageCount: string;
  thinking: string;
  user: string;
  assistant: string;
};

const EXPORT_LABELS: Record<ExportLocaleKey, ExportLabels> = {
  "zh-CN": {
    platform: "平台",
    link: "链接",
    originalConversation: "原始对话",
    collectedAt: "采集时间",
    messageCount: "消息数",
    thinking: "思考过程",
    user: "用户",
    assistant: "助手",
  },
  "zh-TW": {
    platform: "平台",
    link: "連結",
    originalConversation: "原始對話",
    collectedAt: "採集時間",
    messageCount: "訊息數",
    thinking: "思考過程",
    user: "使用者",
    assistant: "助手",
  },
  en: {
    platform: "Platform",
    link: "Link",
    originalConversation: "Original Conversation",
    collectedAt: "Collected At",
    messageCount: "Message Count",
    thinking: "Thinking",
    user: "User",
    assistant: "Assistant",
  },
  de: {
    platform: "Plattform",
    link: "Link",
    originalConversation: "Originalunterhaltung",
    collectedAt: "Erfasst am",
    messageCount: "Anzahl Nachrichten",
    thinking: "Denkprozess",
    user: "Benutzer",
    assistant: "Assistent",
  },
  "ja-JP": {
    platform: "プラットフォーム",
    link: "リンク",
    originalConversation: "元の会話",
    collectedAt: "収集日時",
    messageCount: "メッセージ数",
    thinking: "思考プロセス",
    user: "ユーザー",
    assistant: "アシスタント",
  },
  ko: {
    platform: "플랫폼",
    link: "링크",
    originalConversation: "원본 대화",
    collectedAt: "수집 시간",
    messageCount: "메시지 수",
    thinking: "사고 과정",
    user: "사용자",
    assistant: "어시스턴트",
  },
  "ru-RU": {
    platform: "Платформа",
    link: "Ссылка",
    originalConversation: "Исходный диалог",
    collectedAt: "Время сбора",
    messageCount: "Количество сообщений",
    thinking: "Ход мыслей",
    user: "Пользователь",
    assistant: "Ассистент",
  },
};

function resolveExportLocale(locale?: string): ExportLocaleKey {
  return resolveLocalePreference(locale) as ExportLocaleKey;
}

function getLocalizedPlatformName(
  platform: ChatConversation["platform"],
  locale: ExportLocaleKey,
): string {
  const message = i18n.global.getLocaleMessage(locale) as {
    chat?: { platforms?: Partial<Record<ChatConversation["platform"], string>> };
  };
  const name = message?.chat?.platforms?.[platform];
  return typeof name === "string" && name.trim()
    ? name
    : getPlatformConfig(platform).name;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number | undefined, locale: string): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 导出为 JSON 格式
 */
function exportToJson(
  conversation: ChatConversation,
  options: ExportOptions
): string {
  type ExportedMessage = {
    role: ChatConversation["messages"][number]["role"];
    content: ChatConversation["messages"][number]["content"];
    timestamp?: number;
    thinking?: string;
  };

  type ExportedMetadata = {
    id: string;
    externalId?: string;
    link?: string;
    createdAt: number;
    collectedAt?: number;
    messageCount: number;
  };

  type ExportedConversation = {
    title: string;
    platform: ChatConversation["platform"];
    messages: ExportedMessage[];
    metadata?: ExportedMetadata;
  };

  const data: ExportedConversation = {
    title: conversation.title,
    platform: conversation.platform,
    messages: conversation.messages.map((m) => {
      const msg: ExportedMessage = {
        role: m.role,
        content: m.content,
      };
      if (options.includeTimestamps && m.timestamp) {
        msg.timestamp = m.timestamp;
      }
      if (options.includeThinking && m.thinking) {
        msg.thinking = m.thinking;
      }
      return msg;
    }),
  };

  if (options.includeMetadata) {
    data.metadata = {
      id: conversation.id,
      externalId: conversation.externalId,
      link: conversation.link,
      createdAt: conversation.createdAt,
      collectedAt: conversation.collectedAt,
      messageCount: conversation.messageCount,
    };
  }

  return JSON.stringify(data, null, 2);
}

/**
 * 导出为 Markdown 格式
 */
function exportToMarkdown(
  conversation: ChatConversation,
  options: ExportOptions,
  locale: ExportLocaleKey
): string {
  const labels = EXPORT_LABELS[locale];
  const lines: string[] = [];

  // 标题
  lines.push(`# ${conversation.title}`);
  lines.push("");

  // 元数据
  if (options.includeMetadata) {
    lines.push(`> **${labels.platform}**: ${getLocalizedPlatformName(conversation.platform, locale)}`);
    if (conversation.link) {
      lines.push(`> **${labels.link}**: [${labels.originalConversation}](${conversation.link})`);
    }
    lines.push(`> **${labels.collectedAt}**: ${formatTimestamp(conversation.collectedAt, locale)}`);
    lines.push(`> **${labels.messageCount}**: ${conversation.messageCount}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // 消息
  for (const message of conversation.messages) {
    const roleLabel = message.role === "user" ? `👤 **${labels.user}**` : `🤖 **${labels.assistant}**`;

    if (options.includeTimestamps && message.timestamp) {
      lines.push(`### ${roleLabel} · ${formatTimestamp(message.timestamp, locale)}`);
    } else {
      lines.push(`### ${roleLabel}`);
    }
    lines.push("");

    // 思考过程
    if (options.includeThinking && message.thinking) {
      lines.push("<details>");
      lines.push(`<summary>💭 ${labels.thinking}</summary>`);
      lines.push("");
      lines.push(message.thinking);
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }

    lines.push(getMessageContent(message));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 导出为纯文本格式
 */
function exportToTxt(
  conversation: ChatConversation,
  options: ExportOptions,
  locale: ExportLocaleKey
): string {
  const labels = EXPORT_LABELS[locale];
  const lines: string[] = [];
  const separator = "=".repeat(60);

  // 标题
  lines.push(separator);
  lines.push(conversation.title);
  lines.push(separator);
  lines.push("");

  // 元数据
  if (options.includeMetadata) {
    lines.push(`${labels.platform}: ${getLocalizedPlatformName(conversation.platform, locale)}`);
    if (conversation.link) {
      lines.push(`${labels.link}: ${conversation.link}`);
    }
    lines.push(`${labels.collectedAt}: ${formatTimestamp(conversation.collectedAt, locale)}`);
    lines.push(`${labels.messageCount}: ${conversation.messageCount}`);
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("");
  }

  // 消息
  for (const message of conversation.messages) {
    const roleLabel = message.role === "user" ? `[${labels.user}]` : `[${labels.assistant}]`;

    if (options.includeTimestamps && message.timestamp) {
      lines.push(`${roleLabel} (${formatTimestamp(message.timestamp, locale)})`);
    } else {
      lines.push(roleLabel);
    }
    lines.push("");

    if (options.includeThinking && message.thinking) {
      lines.push(`[${labels.thinking}]`);
      lines.push(message.thinking);
      lines.push("");
    }

    lines.push(getMessageContent(message));
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 导出为 HTML 格式
 */
function exportToHtml(
  conversation: ChatConversation,
  options: ExportOptions,
  locale: ExportLocaleKey
): string {
  const labels = EXPORT_LABELS[locale];
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");

  const messages = conversation.messages
    .map((m) => {
      const roleClass = m.role === "user" ? "user" : "assistant";
      const roleLabel = m.role === "user" ? labels.user : labels.assistant;
      const timestamp = options.includeTimestamps && m.timestamp
        ? `<span class="timestamp">${formatTimestamp(m.timestamp, locale)}</span>`
        : "";
      const thinking = options.includeThinking && m.thinking
        ? `<details class="thinking"><summary>💭 ${labels.thinking}</summary><div>${escapeHtml(m.thinking)}</div></details>`
        : "";

      return `
        <div class="message ${roleClass}">
          <div class="message-header">
            <span class="role">${roleLabel}</span>
            ${timestamp}
          </div>
          ${thinking}
          <div class="content">${escapeHtml(getMessageContent(m))}</div>
        </div>
      `;
    })
    .join("");

  const metadata = options.includeMetadata
    ? `
      <div class="metadata">
        <p><strong>${labels.platform}:</strong> ${getLocalizedPlatformName(conversation.platform, locale)}</p>
        ${conversation.link ? `<p><strong>${labels.link}:</strong> <a href="${conversation.link}" target="_blank">${labels.originalConversation}</a></p>` : ""}
        <p><strong>${labels.collectedAt}:</strong> ${formatTimestamp(conversation.collectedAt, locale)}</p>
        <p><strong>${labels.messageCount}:</strong> ${conversation.messageCount}</p>
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 20px; color: #1a1a1a; }
    .metadata { background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metadata p { margin: 4px 0; color: #666; }
    .metadata a { color: #3b82f6; }
    .message { background: #fff; padding: 16px; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .message.user { border-left: 4px solid #3b82f6; }
    .message.assistant { border-left: 4px solid #10b981; }
    .message-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .role { font-weight: 600; color: #1a1a1a; }
    .timestamp { font-size: 12px; color: #999; }
    .content { white-space: pre-wrap; color: #333; }
    .thinking { margin-bottom: 12px; }
    .thinking summary { cursor: pointer; color: #666; font-size: 14px; }
    .thinking div { margin-top: 8px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(conversation.title)}</h1>
    ${metadata}
    ${messages}
  </div>
</body>
</html>`;
}

/**
 * 导出对话
 */
export function exportConversation(
  conversation: ChatConversation,
  options: ExportOptions,
  locale?: string
): string {
  const resolvedLocale = resolveExportLocale(locale);
  switch (options.format) {
    case "json":
      return exportToJson(conversation, options);
    case "markdown":
      return exportToMarkdown(conversation, options, resolvedLocale);
    case "txt":
      return exportToTxt(conversation, options, resolvedLocale);
    case "html":
      return exportToHtml(conversation, options, resolvedLocale);
    default:
      return exportToJson(conversation, options);
  }
}

const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  json: "json",
  markdown: "md",
  txt: "txt",
  html: "html",
  pdf: "pdf",
};

const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  json: "application/json",
  markdown: "text/markdown",
  txt: "text/plain",
  html: "text/html",
  pdf: "application/pdf",
};

/**
 * 下载导出文件
 */
export function downloadExport(
  conversation: ChatConversation,
  options: ExportOptions,
  locale?: string
): void {
  const content = exportConversation(conversation, options, locale);
  const extension = EXPORT_EXTENSIONS[options.format];
  const mimeType = EXPORT_MIME_TYPES[options.format];
  const filename = `${conversation.title.replace(/[/\\?%*:|"<>]/g, "-")}.${extension}`;

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
