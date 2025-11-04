import Dashboard from '../pages/Dashboard.jsx'
import LogIn from '../pages/LogIn.jsx'
import Register from '../pages/Register.jsx'
import ProtectedTestPage from '../pages/ProtectedTestPage.jsx'
import Prescription_Mainpage from '../pages/Prescription_Mainpage.jsx'
import { createProtectedRoutes } from '../auth/auth.jsx'

const unprotected_routes = [
  { path: '/login', element: <LogIn /> },
  { path: '/register', element: <Register /> },
  { path: '/', element: <LogIn /> } // Redirect to login by default
]

const protected_routes = createProtectedRoutes([
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/e', element: <ProtectedTestPage /> },
  { path: '/prescription', element: <Prescription_Mainpage /> },
])

export { unprotected_routes, protected_routes }