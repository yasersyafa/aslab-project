
import ContactForm from "./ContactForm"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { Button } from "../ui/button"
import { useState } from "react"

export default function Navbar() {
    const [open, setOpen] = useState<boolean>(false)

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white w-full border-b-4 border-black py-5">
            <div className="container mx-auto flex justify-between items-center px-5 lg:px-0">
                {/* logo */}
                <h1 className="font-bold text-2xl">
                    GameTech Lab
                </h1>

                <ul className="space-x-12 flex items-center font-base text-base">
                    <li>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button>Contact Us</Button>
                            </DialogTrigger>
                            <DialogContent className="max-sm:max-h-[60vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Contact Form</DialogTitle>
                                    <DialogDescription>Please fill these fields below</DialogDescription>
                                </DialogHeader>
                                <ContactForm onSuccess={() => setOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </li>
                </ul>
            </div>
        </nav>
    )
}