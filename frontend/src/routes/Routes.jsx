import React, { Suspense } from 'react'
import { createProtectedRoutes } from '../auth/auth.jsx'
import AppLayout from '../components/AppLayout.jsx'

// Eagerly loaded (small / landing pages)
import LogIn from '../pages/LogIn.jsx'
import Register from '../pages/Register.jsx'
import Home from '../pages/Home.jsx'

// Lazy-loaded feature pages
const Dashboard = React.lazy(() => import('../pages/Dashboard.jsx'))
const InteractionCheck = React.lazy(() => import('../pages/InteractionCheck.jsx'))
const FoodDrugInteraction = React.lazy(() => import('../pages/FoodDrugInteraction.jsx'))
const History = React.lazy(() => import('../pages/History.jsx'))
const MealPlan = React.lazy(() => import('../pages/PersonalizedMealPlan.jsx'))
const Prescription_Mainpage = React.lazy(() => import('../pages/Prescription_Mainpage.jsx'))
const CrossBrandComparator = React.lazy(() => import('../pages/CrossBrandComparator.jsx'))
const TreatmentIdentifier = React.lazy(() => import('../pages/TreatmentIdentifier.jsx'))
const Profile = React.lazy(() => import('../pages/Profile.jsx'))
const Setting = React.lazy(() => import('../pages/Setting.jsx'))
const ProtectedTestPage = React.lazy(() => import('../pages/ProtectedTestPage.jsx'))

const LazyPage = ({ children }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  }>
    {children}
  </Suspense>
)

const unprotected_routes = [
  { path: '/login', element: <LogIn /> },
  { path: '/register', element: <Register /> },
  { path: '/', element: <Home /> }
]

const protected_routes = createProtectedRoutes([
  { path: '/dashboard', element: <AppLayout><LazyPage><Dashboard /></LazyPage></AppLayout> },
  { path: '/interaction-check', element: <AppLayout><LazyPage><InteractionCheck /></LazyPage></AppLayout> },
  { path: '/e', element: <AppLayout><LazyPage><ProtectedTestPage /></LazyPage></AppLayout> },
  { path: '/advisory', element: <AppLayout><LazyPage><FoodDrugInteraction /></LazyPage></AppLayout> },
  { path: "/history", element: <AppLayout><LazyPage><History /></LazyPage></AppLayout> },
  { path: "/meal-plan", element: <AppLayout><LazyPage><MealPlan /></LazyPage></AppLayout> },
  { path: '/prescription', element: <AppLayout><LazyPage><Prescription_Mainpage /></LazyPage></AppLayout> },
  { path: '/comparator', element: <AppLayout><LazyPage><CrossBrandComparator /></LazyPage></AppLayout> },
  { path: '/treatment-identifier', element: <AppLayout><LazyPage><TreatmentIdentifier /></LazyPage></AppLayout> },
  { path: '/profile', element: <LazyPage><Profile /></LazyPage> },
  { path: '/settings', element: <LazyPage><Setting /></LazyPage> }
])

export { unprotected_routes, protected_routes }