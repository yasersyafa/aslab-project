import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { formSchema, type FormSchemaType } from "../schema/formSchema"
import { toast } from "react-toastify"
import { useTelegram } from "../hooks/useTelegram"



const TelegramForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  });

  const { sendMessage, sendPhoto, loading } = useTelegram();

  const onSubmit = async (data: FormSchemaType) => {
    const escapeMarkdown = (text: string) =>
      text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&"); // Escape karakter spesial MarkdownV2

    const caption = `🚨 ALERT!\n\n👤 Nama: ${escapeMarkdown(data.nama)}\n🏫 Kelas: GT ${escapeMarkdown(data.kelas)} ${escapeMarkdown(data.angkatan)}\n📞 No. Telp: ${escapeMarkdown(data.telp)}\n💬 Pesan: ${escapeMarkdown(data.message)}`

    if(data.foto?.[0]) {
      await sendPhoto(data.foto[0], caption)
      .then(() => {
        toast.success("Pesan terkirim!")
        reset()
      })
      .catch(() => {
        toast.error("Gagal mengirim pesan")
      })
    } else {
      await sendMessage(caption)
      .then(() => {
        toast.success("Pesan terkirim!")
        reset()
      })
      .catch(() => {
        toast.error("Gagal mengirim pesan")
      })
    }

    
  };

  return (
    
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto p-4 space-y-4 border-2 bg-white shadow-pixel text-xs w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl"
    >
      {/* Nama */}
      <div className="mt-2">
        <label className="block font-medium">Nama<span className="text-red-400">*</span></label>
        <input
          type="text"
          {...register("nama")}
          className="w-full border-2 shadow-pixel mt-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Jhon Doe"
        />
        {errors.nama?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.nama.message}</p>
        )}
      </div>

      {/* Kelas */}
      <div className="mt-2">
        <label className="block font-medium">Kelas<span className="text-red-400">*</span></label>
        <div className="relative">
          <select
            {...register("kelas")}
            className="w-full appearance-none border-2 shadow-pixel mt-2 px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">Pilih kelas</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        {errors.kelas?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.kelas.message}</p>
        )}
      </div>

      {/* Angkatan */}
      <div className="mt-2">
        <label className="block font-medium">Angkatan<span className="text-red-400">*</span></label>
        <select
          {...register("angkatan")}
          className="w-full appearance-none border-2 shadow-pixel mt-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Pilih angkatan</option>
          <option value="2020">2020</option>
          <option value="2021">2021</option>
          <option value="2022">2022</option>
          <option value="2023">2023</option>
          <option value="2024">2024</option>
        </select>
        {errors.angkatan?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.angkatan.message}</p>
        )}
      </div>

      {/* Nomor Telepon */}
      <div>
        <label className="block font-medium">Nomor Telepon<span className="text-red-400">*</span></label>
        <input
          type="text"
          {...register("telp")}
          className="w-full border-2 shadow-pixel mt-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="08123456789"
        />
        {errors.telp?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.telp.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="block font-medium">Pesan<span className="text-red-400">*</span></label>
        <textarea
          {...register("message")}
          className="w-full border-2 shadow-pixel mt-2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          rows={5}
          placeholder="Tulis pesan disini..."
        />
        {errors.message?.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
        )}
      </div>

      {/* Upload Foto */}
      <div className="mt-2">
        <label className="block font-medium">Upload Foto</label>
        <input
          type="file"
          accept="image/*"
          {...register("foto")}
          className="block w-full text-xs mt-2 text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:border-0
            file:text file:font-semibold
            file:bg-yellow-50 file:text-yellow-700
            hover:file:bg-yellow-100 border-2 shadow-pixel border-black"
        />
        {errors.foto?.message && (
          <p className="text-red-500 text-sm mt-1">{!errors.foto.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="bg-yellow-500 text-white px-4 py-3 text-center hover:bg-yellow-600 disabled:opacity-50 w-full shadow-pixel"
      >
        {loading ? "Mengirim..." : "Kirim"}
      </button>
    </form>
  );
};

export default TelegramForm;
