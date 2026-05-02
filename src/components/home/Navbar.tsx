import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { label: "Home", target: "home" },
  { label: "How to Borrow", target: "how-to-borrow" },
  { label: "Contact", target: "contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const scrollTo = (id: string, closeSheet = false) => {
    if (closeSheet) setOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, closeSheet ? 150 : 0);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white w-full border-b-4 border-black py-4 sm:py-5">
      <div className="container mx-auto flex justify-between items-center px-4 sm:px-5 lg:px-0">
        <h1 className="font-bold text-xl sm:text-2xl">GameTech Lab</h1>

        {/* desktop nav */}
        <ul className="hidden sm:flex items-center gap-6 lg:gap-8 font-base text-base">
          {NAV_ITEMS.map((item) => (
            <li key={item.target}>
              <button
                onClick={() => scrollTo(item.target)}
                className="hover:underline underline-offset-4 cursor-pointer"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="neutral"
              size="icon"
              className="sm:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetTitle className="font-bold text-2xl mb-6">Menu</SheetTitle>
            <div className="flex flex-col gap-5 text-lg font-base">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.target}
                  onClick={() => scrollTo(item.target, true)}
                  className="hover:underline underline-offset-4 cursor-pointer text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
