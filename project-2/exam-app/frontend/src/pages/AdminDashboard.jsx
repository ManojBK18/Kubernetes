import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { authApi, examApi, resultApi } from '../api'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [users,   setUsers]   = useState([])
  const [exams,   setExams]   = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('overview')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    Promise.all([authApi.users(), examApi.list(), resultApi.list()])
      .then(([u, e, r]) => {
        setUsers(u.results || u)
        setExams(e.results || e)
        setResults(r.results || r)
      }).finally(() => setLoading(false))
  }, [])

  async function handleDeleteUser(id, username) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return
    await authApi.deleteUser(id)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const students = users.filter(u => u.role === 'student')
  const teachers = users.filter(u => u.role === 'teacher')
  const admins   = users.filter(u => u.role === 'admin')
  const passRate = results.length
    ? Math.round(results.filter(r => r.passed).length / results.length * 100) : 0

  const filteredUsers = roleFilter ? users.filter(u => u.role === roleFilter) : users

  if (loading) return <div className="loading">Loading admin panel…</div>

  return (
    <div className="page">
      <Navbar />
      <div className="container content">

        <h2 className="section-title mb-2">Admin Panel</h2>

        <div className="stats-grid">
          <div className="stat-card"><div className="value">{students.length}</div><div className="label">Students</div></div>
          <div className="stat-card"><div className="value">{teachers.length}</div><div className="label">Teachers</div></div>
          <div className="stat-card"><div className="value">{exams.length}</div><div className="label">Total Exams</div></div>
          <div className="stat-card"><div className="value">{results.length}</div><div className="label">Submissions</div></div>
          <div className="stat-card"><div className="value">{passRate}%</div><div className="label">Pass Rate</div></div>
        </div>

        <div className="flex gap-1 mb-2">
          {['overview','users','exams','results'].map(t => (
            <button key={t} className={`btn btn-sm ${tab===t?'btn-primary':'btn-secondary'}`} onClick={() => setTab(t)}>
              {{ overview:'📊 Overview', users:'👥 Users', exams:'📋 Exams', results:'🏆 Results' }[t]}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid-2">
            <div className="card">
              <h3 style={{marginBottom:'1rem'}}>User Breakdown</h3>
              {[['Students', students.length, 'var(--primary)'],
                ['Teachers', teachers.length, 'var(--success)'],
                ['Admins',   admins.length,   'var(--warning)']
              ].map(([label, count, color]) => (
                <div key={label} style={{ marginBottom:'.75rem' }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span><span style={{ color, fontWeight:600 }}>{count}</span>
                  </div>
                  <div style={{ background:'var(--gray-100)', borderRadius:'99px', height:'8px' }}>
                    <div style={{ width:`${users.length ? count/users.length*100 : 0}%`, background:color, height:'100%', borderRadius:'99px' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{marginBottom:'1rem'}}>Recent Submissions</h3>
              {results.slice(0,5).map(r => (
                <div key={r.id} className="flex justify-between items-center" style={{ padding:'.4rem 0', borderBottom:'1px solid var(--gray-100)' }}>
                  <div>
                    <div className="text-sm" style={{ fontWeight:500 }}>{r.student_name}</div>
                    <div className="text-sm text-muted">{r.exam_title}</div>
                  </div>
                  <span className={`tag ${r.passed?'green':'red'}`}>{r.percentage.toFixed(0)}%</span>
                </div>
              ))}
              {results.length === 0 && <p className="text-sm text-muted">No submissions yet.</p>}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="card">
            <div className="card-header">
              <span>{users.length} total users</span>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ padding:'.3rem .6rem', borderRadius:'var(--radius)', border:'1px solid var(--gray-300)', fontSize:'.85rem' }}>
                <option value="">All roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id}>
                      <td className="text-muted">{i+1}</td>
                      <td><strong>{u.first_name} {u.last_name}</strong></td>
                      <td>{u.username}</td>
                      <td className="text-muted">{u.email}</td>
                      <td><span className={`tag ${u.role==='admin'?'red':u.role==='teacher'?'blue':'green'}`}>{u.role}</span></td>
                      <td>
                        {u.role !== 'admin' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id, u.username)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exams */}
        {tab === 'exams' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Created By</th><th>Questions</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {exams.map(exam => (
                    <tr key={exam.id}>
                      <td><strong>{exam.title}</strong></td>
                      <td>{exam.created_by_name}</td>
                      <td>{exam.question_count}</td>
                      <td>{exam.duration_minutes} min</td>
                      <td><span className={`tag ${exam.is_active?'green':'red'}`}>{exam.is_active?'Active':'Inactive'}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/exam/${exam.id}/manage`)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results */}
        {tab === 'results' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>%</th><th>Grade</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id}>
                      <td>{r.student_name}</td>
                      <td>{r.exam_title}</td>
                      <td>{r.obtained_marks}/{r.total_marks}</td>
                      <td>{r.percentage.toFixed(1)}%</td>
                      <td><span className="tag blue">{r.grade}</span></td>
                      <td><span className={`tag ${r.passed?'green':'red'}`}>{r.passed?'Passed':'Failed'}</span></td>
                      <td className="text-sm text-muted">{new Date(r.calculated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

