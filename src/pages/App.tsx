import ContactSection from '@/components/home/ContactSection'
import Footer from '@/components/home/Footer'
import HeroSection from '@/components/home/HeroSection'
import HowToLendSection from '@/components/home/HowToLendSection'
import Navbar from '@/components/home/Navbar'
import { Toaster } from '@/components/ui/sonner'
import pattern from '@/assets/pattern.png'

function App() {
  return (
    <div style={{ backgroundImage: `url(${pattern})`, backgroundRepeat: 'repeat' }}>
      <Navbar />
      <HeroSection />
      <HowToLendSection />
      <ContactSection />
      <Footer />
      <Toaster />
    </div>
  )
}

export default App
