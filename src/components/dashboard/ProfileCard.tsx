import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, GraduationCapIcon } from "lucide-react"
import { Card } from "../ui/card"

export default function ProfileCard() {
  // Sample user data - replace with actual data
  const user = {
    avatar: "/placeholder.svg?height=120&width=120",
    fullName: "Muhammad Yaser Syafa",
    studentId: "5223600080",
    joinedAt: "Sept 15, 2024",
    role: "Game Technology 11 C",
    location: "New York, USA",
  }

  return (
    <Card className="w-full mx-auto h-full flex flex-col lg:flex-row bg-white">
        
          {/* Avatar Section */}
          <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-black p-8 md:p-12 flex flex-col items-center justify-center md:min-w-[300px]">
            <div className="relative">
              <Avatar className="size-40 md:w-48 md:h-48 border-2 border-black shadow-[2px_2px_0px_0px_#000000] rounded-sm">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.fullName} className="object-cover" />
                <AvatarFallback className="text-3xl md:text-4xl font-bold bg-background text-black border-0 rounded-sm">
                  {user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-6">
              <div className="bg-main border-2 rounded-base border-black px-4 py-2 font-black text-black text-sm uppercase tracking-wider shadow-[2px_2px_0px_0px_#000000]">
                Programmer
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-8 md:p-12">
            <div className="mb-8">
              <h1 className="text-4xl font-medium text-black mb-2 tracking-tight">
                {user.fullName}
              </h1>
              <div className="bg-main border-2 border-black px-3 py-1 inline-block font-bold text-black text-sm uppercase shadow-[2px_2px_0px_0px_#000000] rounded-base">
                {user.role}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-background rounded-base border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150">
                <div className="flex items-center gap-4">
                  <div className="bg-main rounded-base p-2 border-2 border-black">
                    <GraduationCapIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase tracking-widest mb-1">Student ID</p>
                    <p className="font-semibold text-medium">{user.studentId}</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-base border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150">
                <div className="flex items-center gap-4">
                  <div className="bg-main rounded-base p-2 border-2 border-black">
                    <CalendarDays className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black uppercase tracking-widest mb-1">Joined</p>
                    <p className="font-semibold text-medium">{user.joinedAt}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </Card>
  )
}
