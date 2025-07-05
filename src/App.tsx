import HeroSection from './components/partials/HeroSection'
import Navbar from './components/partials/Navbar'
import { Toaster } from 'sonner'
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
