import { Button } from "@/components/ui/button";

export default function ContactSection() {
  return (
    <section id="contact" className="py-24 px-5">
      <div className="container mx-auto">
        <div className="mb-14 text-center">
          <h2 className="font-extrabold text-4xl sm:text-5xl mb-4">
            Contact Becky
          </h2>
          <p className="text-lg max-w-xl mx-auto font-base opacity-70">
            Got questions? Reach out directly — Becky's got you covered.
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-secondary-background border-2 border-black rounded-base shadow-shadow p-8 flex flex-col gap-6">
          {/* Telegram bot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <p className="font-heading font-bold text-lg">Telegram Bot</p>
                <p className="font-base opacity-60 text-sm">
                  For borrowing requests &amp; status
                </p>
              </div>
            </div>
            <Button
              onClick={() => window.open("https://t.me/aslabGT_bot", "_blank")}
              className="cursor-pointer"
            >
              @aslabGT_bot
            </Button>
          </div>

          {/* WhatsApp direct */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💬</span>
              <div>
                <p className="font-heading font-bold text-lg">WhatsApp</p>
                <p className="font-base opacity-60 text-sm">
                  +62 895-6227-60258
                </p>
              </div>
            </div>
            <Button
              variant="neutral"
              onClick={() =>
                window.open("https://wa.me/62895622760258", "_blank")
              }
              className="cursor-pointer"
            >
              Chat on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
