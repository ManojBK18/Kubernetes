import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const homeLink = user?.role === 'student' ? '/student'
                 : user?.role === 'teacher' ? '/teacher'
                 : '/admin'

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <a href={homeLink} className="navbar-brand">
          📝 ExamPortal
        </a>
        <div className="navbar-right">
          {user && (
            <>
              <span className="text-sm text-muted">{user.first_name || user.username}</span>
              <span className="role-badge">{user.role}</span>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

