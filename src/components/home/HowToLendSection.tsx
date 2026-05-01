type Step = {
  number: number;
  text: string;
  sub?: string;
};

const LAB_STEPS: Step[] = [
  { number: 1, text: "Chat Becky on Telegram!", sub: "@aslabGT_bot" },
  { number: 2, text: "Tell what lab you need" },
  { number: 3, text: "Tell who you are" },
  { number: 4, text: "Send a request via /pinjam" },
  { number: 5, text: "Wait for our aslab to approve" },
  { number: 6, text: "Enjoy the lab! 🏫" },
  { number: 7, text: "Return it with /pengembalian + photo" },
];

const ITEM_STEPS: Step[] = [
  { number: 1, text: "Chat Becky on Telegram!", sub: "@aslabGT_bot" },
  { number: 2, text: "Tell what items you need" },
  { number: 3, text: "Tell who you are" },
  { number: 4, text: "Send a request via /pinjam" },
  { number: 5, text: "Wait for our aslab to approve" },
  { number: 6, text: "Use /ambil — photo item condition when picking up 📸" },
  { number: 7, text: "Return it with /pengembalian" },
  { number: 8, text: "Photo item condition when returning 📸" },
];

function Timeline({ steps, color }: { steps: Step[]; color: string }) {
  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, idx) => (
        <li key={step.number} className="flex gap-4">
          {/* line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full border-2 border-black font-bold text-sm shrink-0 ${color}`}
            >
              {step.number}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-black my-1 min-h-6" />
            )}
          </div>
          {/* text */}
          <div className="pb-6 pt-1">
            <p className="font-heading text-base leading-snug">{step.text}</p>
            {step.sub && (
              <p className="text-sm font-base opacity-60 mt-0.5">{step.sub}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowToLendSection() {
  return (
    <section id="how-to-borrow" className="py-24 px-5">
      <div className="container mx-auto">
        {/* heading */}
        <div className="mb-14 text-center">
          <h2 className="font-extrabold text-4xl sm:text-5xl mb-4">
            How to Borrow
          </h2>
          <p className="text-lg max-w-xl mx-auto font-base opacity-70">
            Two flows — pick whichever applies. Both start with a chat to Becky
            on Telegram.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lab card */}
          <div className="bg-secondary-background border-2 border-black rounded-base shadow-shadow p-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">🏫</span>
              <h3 className="font-extrabold text-2xl">Borrow a Lab</h3>
            </div>
            <Timeline
              steps={LAB_STEPS}
              color="bg-main text-main-foreground"
            />
          </div>

          {/* Item card */}
          <div className="bg-secondary-background border-2 border-black rounded-base shadow-shadow p-8">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">📦</span>
              <h3 className="font-extrabold text-2xl">Borrow Items</h3>
            </div>
            <Timeline
              steps={ITEM_STEPS}
              color="bg-main text-main-foreground"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
