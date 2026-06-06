import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { examApi, resultApi } from '../api'
import { useAuth } from '../App'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [exams,   setExams]   = useState([])
  const [results, setResults] = useState([])
  const [tab,     setTab]     = useState('exams')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]   = useState({ title:'', description:'', duration_minutes:60, pass_percentage:60, is_active:true })
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  useEffect(() => {
    Promise.all([examApi.list(), resultApi.list()])
      .then(([e, r]) => {
        setExams(e.results || e)
        setResults(r.results || r)
      }).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const exam = await examApi.create(form)
      setExams(prev => [exam, ...prev])
      setShowForm(false)
      setForm({ title:'', description:'', duration_minutes:60, pass_percentage:60, is_active:true })
      navigate(`/exam/${exam.id}/manage`)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(exam) {
    const updated = await examApi.update(exam.id, { is_active: !exam.is_active })
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, is_active: updated.is_active } : e))
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return
    await examApi.delete(id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const totalStudents = new Set(results.map(r => r.student_id)).size
  const passRate = results.length ? Math.round(results.filter(r => r.passed).length / results.length * 100) : 0

  if (loading) return <div className="loading">Loading…</div>

  return (
    <div className="page">
      <Navbar />
      <div className="container content">
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title">Teacher Dashboard</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ New Exam'}
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="value">{exams.length}</div><div className="label">My Exams</div></div>
          <div className="stat-card"><div className="value">{results.length}</div><div className="label">Total Submissions</div></div>
          <div className="stat-card"><div className="value">{totalStudents}</div><div className="label">Students Reached</div></div>
          <div className="stat-card"><div className="value">{passRate}%</div><div className="label">Pass Rate</div></div>
        </div>

        {showForm && (
          <div className="card mb-2">
            <h3 style={{ marginBottom:'1rem' }}>Create New Exam</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title *</label>
                <input required value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Python Fundamentals Quiz" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description of this exam…" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input type="number" min="5" max="300" value={form.duration_minutes} onChange={e => setForm(p=>({...p,duration_minutes:+e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Pass Percentage (%)</label>
                  <input type="number" min="1" max="100" value={form.pass_percentage} onChange={e => setForm(p=>({...p,pass_percentage:+e.target.value}))} />
                </div>
              </div>
              <div className="btn-group">
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create & Add Questions →'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="flex gap-1 mb-2">
          {['exams','results'].map(t => (
            <button key={t} className={`btn ${tab===t?'btn-primary':'btn-secondary'}`} onClick={() => setTab(t)}>
              {t === 'exams' ? '📋 My Exams' : '📊 Results'}
            </button>
          ))}
        </div>

        {tab === 'exams' && (
          <div className="grid-2">
            {exams.length === 0 && <p className="empty">No exams yet. Create your first exam!</p>}
            {exams.map(exam => (
              <div key={exam.id} className="exam-card">
                <div className="flex items-center justify-between">
                  <h3>{exam.title}</h3>
                  <span className={`tag ${exam.is_active ? 'green' : 'red'}`}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                {exam.description && <p className="text-sm text-muted">{exam.description}</p>}
                <div className="exam-card-meta">
                  <span className="tag">⏱ {exam.duration_minutes} min</span>
                  <span className="tag">❓ {exam.question_count} questions</span>
                  <span className="tag">🎯 Pass: {exam.pass_percentage}%</span>
                </div>
                <div className="btn-group mt-1">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/exam/${exam.id}/manage`)}>
                    Manage Questions
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(exam)}>
                    {exam.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exam.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'results' && (
          <div className="card">
            {results.length === 0
              ? <p className="empty">No results yet.</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Student</th><th>Exam</th><th>Score</th><th>%</th><th>Grade</th><th>Status</th><th>Date</th></tr>
                    </thead>
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
              )}
          </div>
        )}
      </div>
    </div>
  )
}

