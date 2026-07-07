import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Roles from './pages/Roles'
import TaskDays from './pages/TaskDays'
import ScheduleConstructor from './pages/ScheduleConstructor'
import Settings from './pages/Settings'
import Admins from './pages/Admins'
import SpeakerGift from './pages/SpeakerGift'

// A simple auth wrapper (in real app, use Context/Zustand)
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="roles" element={<Roles />} />
          <Route path="task-days" element={<TaskDays />} />
          <Route path="schedule" element={<ScheduleConstructor />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admins" element={<Admins />} />
          <Route path="speaker-gift" element={<SpeakerGift />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
