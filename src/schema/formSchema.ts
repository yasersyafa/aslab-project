import { z } from "zod";

export const borrowingTypes = ["Lab", "Alat"] as const;
export const labRooms = [
  "Lab Game Design", "Lab Game Development",
  "Lab Multimedia",  "Lab Komputer Umum",
] as const;
export const tools = [
  "Laptop", "Drawing Tablet", "Kamera", "Tripod",
  "Mikrofon", "Headset", "Joystick / Controller", "Lainnya",
] as const;

export const formSchema = z.object({
  name:         z.string().min(2, "Nama minimal 2 karakter"),
  studentClass: z.enum(["A", "B", "C", "D"], { required_error: "Kelas wajib dipilih" }),
  studentYear:  z.enum(["2022", "2023", "2024", "2025"], { required_error: "Angkatan wajib dipilih" }),
  phone: z.string()
    .regex(/^(\+62|62|08)[0-9]{8,13}$/, "Format: 08xx atau +62xx"),
  borrowingType: z.enum(borrowingTypes, { required_error: "Jenis peminjaman wajib dipilih" }),
  labRoom:      z.string().optional(),
  toolName:     z.string().optional(),
  toolOtherName: z.string().optional(),
  borrowDate:   z.string().min(1, "Tanggal peminjaman wajib diisi"),
  borrowTime:   z.string().min(1, "Jam mulai wajib diisi"),
  returnTime:   z.string().min(1, "Jam selesai wajib diisi"),
  purpose:      z.string().min(10, "Keperluan minimal 10 karakter").max(500, "Keperluan maksimal 500 karakter"),
}).superRefine((data, ctx) => {
  if (data.borrowingType === "Lab" && !data.labRoom) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ruang lab wajib dipilih", path: ["labRoom"] });
  }
  if (data.borrowingType === "Alat" && !data.toolName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nama alat wajib dipilih", path: ["toolName"] });
  }
  if (data.borrowingType === "Alat" && data.toolName === "Lainnya" && !data.toolOtherName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nama alat wajib diisi", path: ["toolOtherName"] });
  }
  if (data.borrowTime >= data.returnTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Jam selesai harus setelah jam mulai", path: ["returnTime"] });
  }
});

export type FormSchemaType = z.infer<typeof formSchema>;