import { useState } from "react";
import type { FormSchemaType } from "@/schema/formSchema";

const GAS_URL = import.meta.env.VITE_GAS_URL as string;

export type SubmitStatus = "idle" | "loading" | "success" | "error";

export function useGasSubmit() {
  const [status, setStatus]     = useState<SubmitStatus>("idle");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]  = useState<string | null>(null);

  const submitBorrowing = async (values: FormSchemaType, telegramId: string) => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const localBookingId = generateBookingId();
      const payload = {
        bookingId:    localBookingId,
        name:         values.name,
        studentClass: values.studentClass,
        studentYear:  values.studentYear,
        telegramId:   telegramId,
        borrowingType: values.borrowingType,
        item:
          values.borrowingType === "Lab"
            ? values.labRoom
            : values.toolName === "Lainnya"
            ? values.toolOtherName
            : values.toolName,
        borrowDate: values.borrowDate,
        borrowTime: values.borrowTime,
        returnTime: values.returnTime,
        purpose:    values.purpose,
      };

      const formData = new URLSearchParams();
      formData.append("payload", JSON.stringify(payload));

      await fetch(GAS_URL, {
        method:  "POST",
        mode:    "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    formData.toString(),
      });

      setBookingId(localBookingId);
      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setBookingId(null);
    setErrorMsg(null);
  };

  return { submitBorrowing, status, bookingId, errorMsg, reset };
}

function generateBookingId(): string {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, "0");
  const d    = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `BOOK${y}${m}${d}${rand}`;
}