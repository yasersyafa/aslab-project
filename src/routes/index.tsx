import App from '@/pages/App'
// import AdminLayout from '@/layouts/AdminLayout'
import { RouterProvider, createBrowserRouter } from 'react-router'
import DashboardPage from '@/pages/dashboard/DashboardPage'

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />
    },
    {
        path: '/dashboard',
        element: <DashboardPage />
    },
    {
        path: '/'
    }
])

export default function Router() {
    return <RouterProvider router={router} />
}