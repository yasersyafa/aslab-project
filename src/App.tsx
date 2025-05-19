import TelegramForm from './components/TelegramForm'
import Toast from './plugins/Toast'

function App() {

  return (
    <div className='w-full h-screen flex flex-col items-center justify-center font-pixel p-2'>
      <h1 className='text-4xl font-bold text-yellow-500 text-center text-shadow-pixel mb-5'>Becky Message!</h1>
      <TelegramForm />
      <Toast />
    </div>
  )
}

export default App
