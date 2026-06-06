import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { resultApi } from '../api'
import Navbar from '../components/Navbar'

export default function ExamResult() {
  const { id }    = useParams()
  const location  = useLocation()
  const navigate  = useNavigate()
  const [result, setResult] = useState(location.state || null)
  const [loading, setLoading] = useState(!location.state)

  useEffect(() => {
    if (result) return
    // Try fetching latest result for this exam if not passed via state
    resultApi.list(id)
      .then(data => {
        const items = data.results || data
        if (items.length) setResult(items[0])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading result…</div>
  if (!result) return (
    <div className="page">
      <Navbar />
      <div className="container content">
        <p className="alert alert-error">Result not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/student')}>← Back</button>
      </div>
    </div>
  )

  const pct    = typeof result.percentage === 'number' ? result.percentage : parseFloat(result.percentage)
  const passed = result.passed
  const grade  = result.grade || (pct >= 90?'A+': pct >= 80?'A': pct >= 70?'B': pct >= 60?'C': pct >= 50?'D':'F')

  return (
    <div className="page">
      <Navbar />
      <div className="container content">
        <div className="card" style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>
          <div className="result-hero">
            <div style={{ fontSize:'3rem', marginBottom:'.5rem' }}>{passed ? '🎉' : '😔'}</div>
            <h2 style={{ marginBottom:'.5rem' }}>{result.exam_title || 'Exam Complete'}</h2>
            <div className={`result-score ${passed?'pass':'fail'}`}>{pct.toFixed(1)}%</div>
            <div className={`result-badge ${passed?'pass':'fail'}`}>
              {passed ? '✓ Passed' : '✗ Failed'}
            </div>
          </div>

          <hr className="divider" />

          <div className="stats-grid" style={{ margin:'1rem 0' }}>
            <div className="stat-card">
              <div className="value">{result.obtained_marks}</div>
              <div className="label">Marks Obtained</div>
            </div>
            <div className="stat-card">
              <div className="value">{result.total_marks}</div>
              <div className="label">Total Marks</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color:'var(--primary)' }}>{grade}</div>
              <div className="label">Grade</div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => navigate('/student')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

