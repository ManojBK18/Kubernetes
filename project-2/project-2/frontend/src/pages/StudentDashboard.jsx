import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { examApi, resultApi } from '../api'
import { useAuth } from '../App'

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [exams,       setExams]       = useState([])
  const [submissions, setSubmissions] = useState([])
  const [results,     setResults]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('exams')

  useEffect(() => {
    Promise.all([
      examApi.list(),
      examApi.mySubmissions(),
      resultApi.list(),
    ]).then(([e, s, r]) => {
      setExams(e.results || e)
      setSubmissions(s.results || s)
      setResults(r.results || r)
    }).finally(() => setLoading(false))
  }, [])

  const submittedIds = new Set(
    submissions.filter(s => s.status === 'submitted').map(s => s.exam)
  )

  async function handleStart(examId) {
    try {
      await examApi.start(examId)
      navigate(`/exam/${examId}/take`)
    } catch (err) {
      alert(err.message)
    }
  }

  const passed = results.filter(r => r.passed).length
  const failed  = results.filter(r => !r.passed).length
  const avgPct  = results.length
    ? (results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1)
    : 0

  if (loading) return <div className="loading">Loading dashboard…</div>

  return (
    <div className="page">
      <Navbar />
      <div className="container content">

        <div className="mb-2">
          <h2 className="section-title">Welcome back, {user.first_name || user.username} 👋</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="value">{exams.length}</div><div className="label">Available Exams</div></div>
          <div className="stat-card"><div className="value">{submissions.length}</div><div className="label">Attempted</div></div>
          <div className="stat-card"><div className="value" style={{color:'var(--success)'}}>{passed}</div><div className="label">Passed</div></div>
          <div className="stat-card"><div className="value">{avgPct}%</div><div className="label">Avg Score</div></div>
        </div>

        <div className="flex gap-1 mb-2">
          {['exams','results'].map(t => (
            <button key={t} className={`btn ${tab===t?'btn-primary':'btn-secondary'}`} onClick={() => setTab(t)}>
              {t === 'exams' ? '📋 Exams' : '📊 My Results'}
            </button>
          ))}
        </div>

        {tab === 'exams' && (
          <>
            <div className="grid-2">
              {exams.length === 0 && <p className="empty">No exams available yet.</p>}
              {exams.map(exam => {
                const done = submittedIds.has(exam.id)
                const result = results.find(r => r.exam_id === exam.id)
                return (
                  <div key={exam.id} className="exam-card">
                    <h3>{exam.title}</h3>
                    {exam.description && <p className="text-sm text-muted">{exam.description}</p>}
                    <div className="exam-card-meta">
                      <span className="tag">⏱ {exam.duration_minutes} min</span>
                      <span className="tag">❓ {exam.question_count} questions</span>
                      <span className="tag">🎯 Pass: {exam.pass_percentage}%</span>
                      {done && result && (
                        <span className={`tag ${result.passed ? 'green' : 'red'}`}>
                          {result.percentage.toFixed(1)}% — {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      )}
                    </div>
                    <div className="btn-group mt-1">
                      {done ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/exam/${exam.id}/result`)}>
                          View Result
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => handleStart(exam.id)}
                          disabled={exam.question_count === 0}>
                          {exam.question_count === 0 ? 'No questions yet' : 'Start Exam →'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'results' && (
          <div className="card">
            {results.length === 0
              ? <p className="empty">No results yet. Take an exam first!</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Exam</th><th>Score</th><th>Percentage</th><th>Grade</th><th>Status</th><th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.exam_title}</strong></td>
                          <td>{r.obtained_marks}/{r.total_marks}</td>
                          <td>{r.percentage.toFixed(1)}%</td>
                          <td><span className="tag blue">{r.grade}</span></td>
                          <td>
                            <span className={`tag ${r.passed ? 'green' : 'red'}`}>
                              {r.passed ? '✓ Passed' : '✗ Failed'}
                            </span>
                          </td>
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

