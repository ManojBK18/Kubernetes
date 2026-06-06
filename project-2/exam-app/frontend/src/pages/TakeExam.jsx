import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { examApi } from '../api'

export default function TakeExam() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [exam,        setExam]        = useState(null)
  const [subId,       setSubId]       = useState(null)
  const [answers,     setAnswers]     = useState({})   // { questionId: choiceId }
  const [current,     setCurrent]     = useState(0)
  const [timeLeft,    setTimeLeft]    = useState(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    examApi.start(id)
      .then(data => {
        setExam(data.exam)
        setSubId(data.submission_id)
        setTimeLeft(data.exam.duration_minutes * 60)
      })
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft])

  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  async function handleSubmit(auto = false) {
    if (!auto && !window.confirm(`Submit exam? You've answered ${Object.keys(answers).length}/${exam.questions.length} questions.`)) return
    clearTimeout(timerRef.current)
    setSubmitting(true)
    try {
      const payload = {
        answers: exam.questions.map(q => ({
          question_id: q.id,
          choice_id:   answers[q.id] || null,
        }))
      }
      const result = await examApi.submit(id, payload)
      navigate(`/exam/${id}/result`, { state: result })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (error) return (
    <div className="auth-wrap" style={{ background:'var(--gray-100)' }}>
      <div className="auth-card">
        <p className="alert alert-error">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/student')}>← Back</button>
      </div>
    </div>
  )

  if (!exam) return <div className="loading">Starting exam…</div>

  const questions = exam.questions
  const q         = questions[current]
  const answered  = Object.keys(answers).length
  const progress  = Math.round(answered / questions.length * 100)

  return (
    <div className="page" style={{ background:'var(--gray-50)' }}>
      {/* Sticky header */}
      <div style={{
        position:'sticky', top:0, zIndex:100, background:'#fff',
        borderBottom:'1px solid var(--gray-200)', padding:'.75rem 0', boxShadow:'var(--shadow)'
      }}>
        <div className="container flex items-center justify-between">
          <div>
            <strong style={{ fontSize:'1rem' }}>{exam.title}</strong>
            <span className="text-sm text-muted" style={{ marginLeft:'1rem' }}>
              {answered}/{questions.length} answered
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`timer ${timeLeft < 120 ? '' : ''}`} style={{ background: timeLeft < 120 ? 'var(--danger-light)':'var(--primary-light)', color: timeLeft < 120 ? 'var(--danger)':'var(--primary)' }}>
              ⏱ {formatTime(timeLeft)}
            </span>
            <button className="btn btn-success btn-sm" onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>

      <div className="container content" style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:'1.5rem', alignItems:'start' }}>

        {/* Question panel */}
        <div>
          <div style={{ marginBottom:'.75rem' }}>
            <div className="exam-progress"><div className="exam-progress-fill" style={{ width:`${progress}%` }} /></div>
          </div>

          <div className="question-block">
            <div className="text-sm text-muted mb-1">Question {current + 1} of {questions.length} · {q.marks} mark{q.marks > 1 ? 's' : ''}</div>
            <p className="q-text">{q.text}</p>

            <div style={{ marginTop:'.75rem' }}>
              {q.choices.map(choice => (
                <label key={choice.id} className={`choice-option ${answers[q.id] === choice.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === choice.id}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: choice.id }))}
                  />
                  {choice.text}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-2">
            <button className="btn btn-secondary" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Previous</button>
            {current < questions.length - 1
              ? <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
              : <button className="btn btn-success" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? 'Submitting…' : '✓ Finish & Submit'}
                </button>
            }
          </div>
        </div>

        {/* Question navigator */}
        <div className="card" style={{ position:'sticky', top:'80px' }}>
          <p className="text-sm" style={{ fontWeight:600, marginBottom:'.75rem' }}>Questions</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'.35rem' }}>
            {questions.map((q2, i) => (
              <button
                key={q2.id}
                onClick={() => setCurrent(i)}
                style={{
                  width:'36px', height:'36px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'.8rem', fontWeight:600,
                  background: i === current ? 'var(--primary)' : answers[q2.id] ? 'var(--success-light)' : 'var(--gray-100)',
                  color: i === current ? '#fff' : answers[q2.id] ? 'var(--success)' : 'var(--gray-600)',
                }}
              >{i + 1}</button>
            ))}
          </div>
          <hr className="divider" />
          <div className="text-sm text-muted">
            <div>🟢 Answered: {answered}</div>
            <div style={{marginTop:'.25rem'}}>⬜ Unanswered: {questions.length - answered}</div>
          </div>
        </div>

      </div>
    </div>
  )
}

