import pattern from '@/assets/pattern.png'
import ProfileCard from '@/components/dashboard/ProfileCard'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
    return (
        <div style={{ backgroundImage: `url(${pattern})`, backgroundRepeat: 'repeat' }} className="min-h-screen bg-background w-full mx-auto p-2 sm:p-10">
            <Card className="w-full bg-white">
                <CardHeader>
                    <CardTitle>HI, ASSISTANT LAB</CardTitle>
                    <CardDescription>
                        {new Date().toLocaleString("en-US", {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* grid card */}
            <div className='w-full grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-5 mt-5'>
                {/* profile */}
                <div className='col-span-2'>
                    <ProfileCard />
               </div>
               <Card className='w-full bg-white max-lg:col-span-2'>
                    <CardHeader>
                        <CardTitle>LATEST ANNOUNCEMENT</CardTitle>
                        <CardDescription>Extra attention</CardDescription>
                    </CardHeader>
                    <CardContent className='text-pretty text-justify'>
                        Diberitahukan kepada seluruh anggota asisten lab angkatan 2023 dan 2024 dapat menghadiri Acara Welcome Party Aslab Angkatan 2024 yang akan dihadiri pada:
                        <br />Tanggal: 1 Agustus 2025
                        <br />Waktu: 13.15 WIB
                        <br />Tempat: Lab Game Design
                    </CardContent>
                    <CardFooter><span className='font-bold'> Yaser Syafa</span></CardFooter>
               </Card>

               {/* assignments and tasks */}
               <Card className='col-span-2 lg:col-span-3 bg-white'>
                    <CardHeader>
                        <CardTitle>ASSIGNMENTS & TASKS</CardTitle>
                        <CardDescription>Here Is Our Job</CardDescription>
                    </CardHeader>
                    <CardContent>

                    </CardContent>
               </Card>
            </div>
        </div>
    )
}