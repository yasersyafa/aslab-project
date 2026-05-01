import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { formSchema, labRooms, tools, type FormSchemaType } from "@/schema/formSchema";
import { useGasSubmit } from "@/hooks/useGasSubmit";

interface BorrowingFormProps {
  onSuccess: () => void;
}

export default function BorrowingForm({ onSuccess }: BorrowingFormProps) {
  const { submitBorrowing, status, bookingId, errorMsg, reset } = useGasSubmit();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      studentClass: undefined,
      studentYear: undefined,
      phone: "",
      borrowingType: undefined,
      labRoom: undefined,
      toolName: undefined,
      toolOtherName: "",
      borrowDate: "",
      borrowTime: "",
      returnTime: "",
      purpose: "",
    },
  });

  const borrowingType = form.watch("borrowingType");
  const toolName      = form.watch("toolName");
  const isLoading     = status === "loading";

  const onSubmit = async (values: FormSchemaType) => {
    await submitBorrowing(values);
  };

  // ── Success ──
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 border-2 border-black">
          <CheckCircle className="size-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Permohonan Terkirim!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aslab akan segera memproses permohonanmu. Notifikasi akan dikirim ke Telegram jika nomor ini sudah terdaftar di bot.
          </p>
          {bookingId && (
            <p className="mt-3 rounded-base border-2 border-black bg-main/20 px-4 py-2 font-mono text-sm font-semibold">
              ID: {bookingId}
            </p>
          )}
        </div>
        <Button variant="neutral" onClick={() => { reset(); form.reset(); onSuccess(); }}>
          Tutup
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 w-full">

        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Data Peminjam
        </p>

        <FormField
          control={form.control} name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl><Input placeholder="Contoh: Budi Santoso" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control} name="studentClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kelas</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["A","B","C","D"].map(c => <SelectItem key={c} value={c}>GT {c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control} name="studentYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Angkatan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih angkatan" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["2022","2023","2024","2025"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Hubungkan Telegram ── */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>No. HP / WhatsApp</FormLabel>
              <FormControl>
                <Input placeholder="08123456789 atau +6281234567890" {...field} />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Daftarkan nomor ini ke bot Telegram dengan kirim <code>/start</code>, lalu balas dengan nomor HP yang sama.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="pt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Detail Peminjaman
        </p>

        <FormField
          control={form.control} name="borrowingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Peminjaman</FormLabel>
              <Select onValueChange={(val) => {
                field.onChange(val);
                form.setValue("labRoom", undefined);
                form.setValue("toolName", undefined);
                form.setValue("toolOtherName", "");
              }} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Lab atau Alat?" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Lab">🏫 Ruang Lab</SelectItem>
                  <SelectItem value="Alat">🔧 Alat / Perangkat</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {borrowingType === "Lab" && (
          <FormField control={form.control} name="labRoom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ruang Lab</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih ruang" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {labRooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {borrowingType === "Alat" && (
          <>
            <FormField control={form.control} name="toolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Alat</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih alat" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {tools.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {toolName === "Lainnya" && (
              <FormField control={form.control} name="toolOtherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Alat (isi manual)</FormLabel>
                    <FormControl><Input placeholder="Contoh: VR Headset" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <FormField control={form.control} name="borrowDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Peminjaman</FormLabel>
              <FormControl>
                <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="borrowTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam Mulai</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField control={form.control} name="returnTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam Selesai</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField control={form.control} name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keperluan / Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="Jelaskan keperluan peminjaman..." className="resize-none" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === "error" && (
          <div className="flex items-center gap-2 rounded-base border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg ?? "Gagal mengirim. Coba lagi."}</span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? <><Loader2 className="size-4 animate-spin" />Mengirim...</>
            : "Kirim Permohonan"
          }
        </Button>
      </form>
    </Form>
  );
}
