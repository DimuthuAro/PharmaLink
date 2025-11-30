import Dashboard from '../pages/Dashboard.jsx'
import LogIn from '../pages/LogIn.jsx'
import Register from '../pages/Register.jsx'
import ProtectedTestPage from '../pages/ProtectedTestPage.jsx'
import FoodDrugInteraction from '../pages/FoodDrugInteraction.jsx'
import { createProtectedRoutes } from '../auth/auth.jsx'

const unprotected_routes = [
  { path: '/login', element: <LogIn /> },
  { path: '/register', element: <Register /> },
  { path: '/', element: <LogIn /> }, // Redirect to login by default
  { path: '/interaction-check', element: <FoodDrugInteraction /> }
]

const protected_routes = createProtectedRoutes([
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/e', element: <ProtectedTestPage /> },
  { path: '/interaction-check', element: <FoodDrugInteraction /> }
])

export { unprotected_routes, protected_routes }