import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../App'

export default function Register() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ username:'', email:'', password:'', first_name:'', last_name:'', role:'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await authApi.register(form)
      const data = await authApi.login({ username: form.username, password: form.password })
      login(data)
      navigate(data.user.role === 'student' ? '/student' : '/teacher')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>📝 ExamPortal</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First name</label>
              <input type="text" value={form.first_name} onChange={set('first_name')} placeholder="John" />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input type="text" value={form.last_name} onChange={set('last_name')} placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input type="text" required value={form.username} onChange={set('username')} placeholder="johndoe" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select value={form.role} onChange={set('role')}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <hr className="divider" />
        <p className="text-sm text-muted" style={{ textAlign:'center' }}>
          Already have an account? <Link to="/login" style={{ color:'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

