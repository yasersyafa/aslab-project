import { useState } from "react";

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID

export function useTelegram() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "HTML",
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.description || "Failed to send message");
      }
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message || "Unknown error");
            throw err;
        } else {
            setError("Unknown error");
            throw new Error("Unknown error");
        }
    } finally {
      setLoading(false);
    }
  };

  const sendPhoto = async (file: File, caption?: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("chat_id", TELEGRAM_CHAT_ID);
      formData.append("photo", file);
      if (caption) formData.append("caption", caption);

      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.description || "Failed to send photo");
      }
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message || "Unknown error");
            throw err;
        } else {
            setError("Unknown error");
            throw new Error("Unknown error");
        }
    } finally {
        setLoading(false);
    }
  };

  return { sendMessage, sendPhoto, loading, error };
}
