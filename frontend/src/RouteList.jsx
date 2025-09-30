
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { unprotected_routes, protected_routes } from './routes/Routes.jsx'

const Unauthorized = () => {
  return (
    <div>
      <h1>Unauthorized Access</h1>
      <p>You do not have permission to view this page.</p>
    </div>
  )
}

const RouteList = () => {
  return (
    <Router>
      <Routes>
        {unprotected_routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
        {protected_routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
      </Routes>
    </Router>
  )
}

export default RouteList