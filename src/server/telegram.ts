/**
 * Telegram Notification Utility
 *
 * Sends formatted notifications to Telegram for monitoring cron jobs
 * across multiple applications.
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramNotification {
  title: string;
  message: string;
  status: "success" | "error" | "info" | "warning";
  context?: Record<string, string | number | boolean>;
}

/**
 * Send a notification to Telegram
 *
 * @param notification - Notification details
 * @returns Promise<boolean> - True if sent successfully
 */
export async function sendTelegramNotification(
  notification: TelegramNotification,
): Promise<boolean> {
  // Skip if Telegram is not configured
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn(
      "Telegram notification skipped: Bot token or chat ID not configured",
    );
    return false;
  }

  try {
    const { title, message, status, context } = notification;

    // Status emoji mapping
    const statusEmoji = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️",
    };

    // Build formatted message
    let text = `${statusEmoji[status]} **${title}**\n\n`;
    text += `${message}\n`;

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      text += "\n📊 **Details:**\n";
      for (const [key, value] of Object.entries(context)) {
        text += `• ${key}: ${value}\n`;
      }
    }

    // Add app identifier and timestamp
    text += `\n🏷️ **App:** Monitoring PPDF\n`;
    text += `🕐 **Time:** ${new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    })}\n`;

    // Send to Telegram Bot API
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
      return false;
    }

    console.log("Telegram notification sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

/**
 * Helper function for cron job success notifications
 */
export async function notifyCronSuccess(
  jobName: string,
  details: Record<string, string | number | boolean>,
): Promise<boolean> {
  return sendTelegramNotification({
    title: `Cron Job: ${jobName}`,
    message: "Cron job executed successfully",
    status: "success",
    context: details,
  });
}

/**
 * Helper function for cron job failure notifications
 */
export async function notifyCronFailure(
  jobName: string,
  error: string,
  details?: Record<string, string | number | boolean>,
): Promise<boolean> {
  return sendTelegramNotification({
    title: `Cron Job Failed: ${jobName}`,
    message: error,
    status: "error",
    context: details,
  });
}
