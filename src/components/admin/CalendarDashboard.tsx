"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function CalendarDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get the start of the week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // Generate 7 days starting from the week start
  const getWeekDays = (startDate: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekStart = getWeekStart(currentDate)
  const weekDays = getWeekDays(weekStart)
  const today = new Date()

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="w-full mx-auto p-2 sm:p-4">
      <Card className="p-3 sm:p-6">
        {/* Week view with responsive layout */}
        <div className="space-y-3 sm:space-y-4">
          {/* Day names row with navigation */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Previous button */}
            <Button
              variant="default"
              size="icon"
              onClick={() => navigateWeek("prev")}
              className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Day names container */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 max-w-2xl">
              {dayNames.map((dayName, index) => (
                <div
                  key={index}
                  className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2"
                >
                  <span className="hidden sm:inline">{dayName}</span>
                  <span className="sm:hidden">{dayName.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Next button */}
            <Button
              variant="default"
              size="icon"
              onClick={() => navigateWeek("next")}
              className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Dates row */}
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {/* Invisible spacer for alignment */}
            <div className="w-8 sm:w-10 flex-shrink-0"></div>

            {/* Date buttons container */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 max-w-2xl">
              {weekDays.map((date) => (
                <div key={date.toISOString()} className="text-center">
                  <div
                    className={cn(
                      "size-10 mx-auto sm:size-12 flex flex-col items-center justify-center p-0 sm:p-1 relative rounded-md",
                      isToday(date) && "bg-main text-main-foreground font-semibold outline-2",
                    )}
                  >
                    <span className="text-sm sm:text-lg font-medium">{date.getDate()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Invisible spacer for alignment */}
            <div className="w-8 sm:w-10 flex-shrink-0"></div>
          </div>
        </div>
      </Card>
    </div>
  )
}
