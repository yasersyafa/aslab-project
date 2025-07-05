import HeroSection from '@/components/home/HeroSection'
import Navbar from '@/components/home/Navbar'
import { Toaster } from '@/components/ui/sonner'
import pattern from '@/assets/pattern.png'

function App() {

  return (
    <div style={{ backgroundImage: `url(${pattern})`, backgroundRepeat: 'repeat' }}>
      <Navbar />
      <HeroSection />
      <Toaster />
    </div>
  )
}

export default App
