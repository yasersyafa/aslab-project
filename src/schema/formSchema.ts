// src/schema/formSchema.ts
import { z } from "zod";

export const formSchema = z.object({
  name: z.string().min(1, "Student Name is required"),
  studentClass: z.enum(["A", "B", "C", "D"], {
    required_error: "Class is required",
  }),
  studentYear: z.enum(["2022", "2023", "2024"], {
    required_error: "Year is required",
  }),
  phone: z
    .string()
    .regex(/^\+62[0-9]{9,14}$/, {
      message: "Phone must start with +62 and contain only numbers",
    }),
  message: z.string().min(1, "Message is required"),
  photo: z.any().optional(), // Optional file
})

export type FormSchemaType = z.infer<typeof formSchema>;