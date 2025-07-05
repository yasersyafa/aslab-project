'use client'

import { Button } from "@/components/ui/button"
import Star9 from "@/components/stars/s9"

export default function HeroSection() {
    return (
        <section className="container px-5 sm:px-0 mx-auto min-h-screen flex flex-col items-center justify-center space-y-20">
            {/* title */}
            <div className="flex flex-col space-y-5 justify-center items-center">
                <h1 className="font-extrabold text-4xl sm:text-5xl text-center text-pretty leading-snug select-text">
                    <span className="relative bg-main/50 border-2 border-main/40 rounded-base px-2">
                        <Star9 pathClassName="bg-main" color="#FF98AD" size={36} className="absolute sm:block hidden md:-bottom-4 md:-right-5 -bottom-2.5 -right-2.5 stroke-5 dark:stroke-3.5 stroke-black dark:stroke-black/70" />
                        <Star9 pathClassName="bg-main" color="#FF98AD" size={36} className="absolute sm:block hidden md:-top-4 md:-left-5 -top-2.5 -left-2.5 stroke-5 dark:stroke-3.5 stroke-black dark:stroke-black/70" />
                        Game Technology
                    </span>
                    <br />
                    Laboratory Assistant.
                </h1>
                <p className="font-base text-lg sm:text-xl max-w-3xl sm:max-w-4xl text-center">We are the Assistant Team — students who contribute to learning, collaboration, and creative projects in the Game Tech Studio Lab.</p>
            </div>
            <Button size={'cta'} className="text-xl font-bold cursor-pointer">
                Get To Know Us
            </Button>
        </section>
    )
}