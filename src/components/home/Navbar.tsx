export default function Navbar() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white w-full border-b-4 border-black py-5">
      <div className="container mx-auto flex justify-between items-center px-5 lg:px-0">
        <h1 className="font-bold text-2xl">GameTech Lab</h1>

        <ul className="space-x-8 flex items-center font-base text-base">
          <li>
            <button
              onClick={() => scrollTo("home")}
              className="hover:underline underline-offset-4 cursor-pointer"
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo("how-to-borrow")}
              className="hover:underline underline-offset-4 cursor-pointer"
            >
              How to Borrow
            </button>
          </li>
          <li>
            <button
              onClick={() => scrollTo("contact")}
              className="hover:underline underline-offset-4 cursor-pointer"
            >
              Contact
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
