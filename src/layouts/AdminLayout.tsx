import pattern from '@/assets/pattern.png'
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLayout() {
    return (
        <div style={{ backgroundImage: `url(${pattern})`, backgroundRepeat: 'repeat' }} className="min-h-screen bg-main w-full mx-auto p-2 sm:p-10">
            <Card className="w-full">
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
        </div>
    )
}