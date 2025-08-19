import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { formSchema, type FormSchemaType } from "@/schema/formSchema"
import { useTelegram } from '@/hooks/useTelegram'

interface ContactFormProps {
    onSuccess: () => void
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      studentClass: undefined,
      studentYear: undefined,
      phone: "",
      message: "",
    },
  })

  const { sendMessage, sendPhoto, loading } = useTelegram();

  const onSubmitDummy = () => {
    onSuccess()
    toast.success('Hello World From Becky')
  }

  const onSubmit = async (values: FormSchemaType) => {
    const whatsappLink = `https://wa.me/${values.phone.replace("+", "")}`
    const caption = `🚨 ALERT!\n\n👤 Nama: ${values.name}\n🏫 Kelas: GT ${values.studentClass} ${values.studentYear}\n📞 No. Telp: <a href="${whatsappLink}">${values.phone}</a>\n💬 Pesan: ${values.message}`

    if(values.photo?.[0]) {
          await sendPhoto(values.photo[0], caption)
          .then(() => {
            toast.success("Sned message successful")
            onSuccess()
          })
          .catch(() => {
            toast.error("Send message failed")
          })
        } else {
          await sendMessage(caption)
          .then(() => {
            toast.success("Send message successful")
            onSuccess()
          })
          .catch(() => {
            toast.error("Send message failed")
          })
        }
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitDummy)} className="space-y-6 mx-auto w-full">
        {/* Student Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Student Class */}
        <FormField
          control={form.control}
          name="studentClass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Class</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Student Year */}
        <FormField
          control={form.control}
          name="studentYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Year</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone Number */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+6281234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Message */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea placeholder="Your message..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Photo Upload */}
        <FormField
          control={form.control}
          name="photo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo (optional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={loading}>
          { loading ? 'Loading...' : 'Send Message' }
        </Button>
      </form>
    </Form>
  )
}
