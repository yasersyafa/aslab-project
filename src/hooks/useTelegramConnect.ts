import { useState, useEffect, useRef } from "react";

const GAS_URL = import.meta.env.VITE_GAS_URL as string;

function generateToken(): string {
  return "TK" + Date.now() + Math.floor(Math.random() * 9000 + 1000);
}

export function useTelegramConnect() {
  const [token]                     = useState(generateToken);
  const [connected, setConnected]   = useState(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const botUrl = `https://t.me/aslabGT_bot?start=${token}`;

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${GAS_URL}?checkToken=${token}`);
        const data = await res.json();
        if (data.connected && data.chatId) {
          setTelegramId(data.chatId);
          setConnected(true);
          clearInterval(intervalRef.current!);
        }
      } catch (_) {}
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { token, botUrl, connected, telegramId, startPolling };
}