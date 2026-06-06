import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authApi } from './api'

import Login            from './pages/Login'
import Register         from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import TakeExam         from './pages/TakeExam'
import ExamResult       from './pages/ExamResult'
import TeacherDashboard from './pages/TeacherDashboard'
import ManageExam       from './pages/ManageExam'
import AdminDashboard   from './pages/AdminDashboard'

export const AuthCtx = createContext(null)
export function useAuth() { return useContext(AuthCtx) }

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(u => setUser(u))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  function login(data) {
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser(data.user)
  }

  function logout() {
    localStorage.clear()
    setUser(null)
  }

  const home = () => {
    if (!user) return '/login'
    if (user.role === 'student') return '/student'
    if (user.role === 'teacher') return '/teacher'
    return '/admin'
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student */}
          <Route path="/student" element={<RequireAuth roles={['student']}><StudentDashboard /></RequireAuth>} />
          <Route path="/exam/:id/take"   element={<RequireAuth roles={['student']}><TakeExam /></RequireAuth>} />
          <Route path="/exam/:id/result" element={<RequireAuth roles={['student']}><ExamResult /></RequireAuth>} />

          {/* Teacher */}
          <Route path="/teacher"         element={<RequireAuth roles={['teacher']}><TeacherDashboard /></RequireAuth>} />
          <Route path="/exam/:id/manage" element={<RequireAuth roles={['teacher','admin']}><ManageExam /></RequireAuth>} />

          {/* Admin */}
          <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />

          <Route path="*" element={<Navigate to={home()} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}

