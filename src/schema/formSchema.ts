// src/schema/formSchema.ts
import { z } from "zod";

export const formSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kelas: z.enum(["A", "B", "C", "D"], {
    errorMap: () => ({ message: "Pilih kelas" }),
  }),
  angkatan: z.enum(["2020", "2021", "2022", "2023", "2024"], {
    errorMap: () => ({ message: "Pilih angkatan" }),
  }),
  message: z.string().min(1, "Pesan wajib diisi"),
  telp: z
    .string()
    .min(1, "Nomor telepon wajib diisi")
    .regex(/^\d+$/, "Harus berupa angka"),
  foto: z
    .any()
    .optional(),
});

export type FormSchemaType = z.infer<typeof formSchema>;