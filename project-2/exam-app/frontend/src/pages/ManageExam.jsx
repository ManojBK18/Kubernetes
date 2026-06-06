import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { examApi } from '../api'

const EMPTY_Q = () => ({
  text: '', marks: 1, order: 0,
  choices: [
    { text:'', is_correct: true  },
    { text:'', is_correct: false },
    { text:'', is_correct: false },
    { text:'', is_correct: false },
  ]
})

export default function ManageExam() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [exam,      setExam]      = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Current question being added/edited
  const [editing, setEditing] = useState(null)   // null | 'new' | questionId

  useEffect(() => {
    Promise.all([examApi.get(id), examApi.getQuestions(id)])
      .then(([e, q]) => {
        setExam(e)
        setQuestions(q.results || q)
      })
      .finally(() => setLoading(false))
  }, [id])

  // ── Form helpers ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_Q())

  function openNew() {
    setForm(EMPTY_Q())
    setEditing('new')
    setError('')
  }

  function openEdit(q) {
    setForm({
      text: q.text, marks: q.marks, order: q.order,
      choices: q.choices.map(c => ({ text: c.text, is_correct: c.is_correct }))
    })
    setEditing(q.id)
    setError('')
  }

  function setChoiceText(i, val) {
    setForm(prev => {
      const choices = [...prev.choices]
      choices[i] = { ...choices[i], text: val }
      return { ...prev, choices }
    })
  }

  function setCorrectChoice(i) {
    setForm(prev => ({
      ...prev,
      choices: prev.choices.map((c, idx) => ({ ...c, is_correct: idx === i }))
    }))
  }

  function validateForm() {
    if (!form.text.trim())                        return 'Question text is required.'
    if (form.choices.some(c => !c.text.trim()))   return 'All 4 choices must have text.'
    if (!form.choices.some(c => c.is_correct))    return 'Mark one choice as correct.'
    return null
  }

  async function handleSave(e) {
    e.preventDefault()
    const err = validateForm()
    if (err) { setError(err); return }

    setSaving(true); setError(''); setSuccess('')
    try {
      if (editing === 'new') {
        const q = await examApi.addQuestion(id, { ...form, order: questions.length })
        setQuestions(prev => [...prev, q])
        setSuccess('Question added!')
      } else {
        const q = await examApi.updateQuestion(id, editing, form)
        setQuestions(prev => prev.map(p => p.id === editing ? q : p))
        setSuccess('Question updated!')
      }
      setEditing(null)
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(qId) {
    if (!window.confirm('Delete this question?')) return
    await examApi.deleteQuestion(id, qId)
    setQuestions(prev => prev.filter(q => q.id !== qId))
  }

  if (loading) return <div className="loading">Loading exam…</div>

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0)

  return (
    <div className="page">
      <Navbar />
      <div className="container content">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
            <h2 className="section-title mt-1">{exam?.title}</h2>
            <p className="text-sm text-muted">
              {questions.length} question{questions.length !== 1 ? 's' : ''} · {totalMarks} total marks
            </p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Add Question</button>
        </div>

        {success && <div className="alert alert-success">{success}</div>}

        {/* Question form */}
        {editing !== null && (
          <div className="card mb-2" style={{ border:'2px solid var(--primary)' }}>
            <h3 style={{ marginBottom:'1rem' }}>
              {editing === 'new' ? 'New Question' : 'Edit Question'}
            </h3>
            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Question Text *</label>
                <textarea
                  required rows={3}
                  value={form.text}
                  onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                  placeholder="Enter your question…"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Marks</label>
                  <input type="number" min={1} max={10} value={form.marks}
                    onChange={e => setForm(p => ({ ...p, marks: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" min={0} value={form.order}
                    onChange={e => setForm(p => ({ ...p, order: +e.target.value }))} />
                </div>
              </div>

              <label style={{ fontWeight:500, fontSize:'.85rem', color:'var(--gray-700)', display:'block', marginBottom:'.5rem' }}>
                Choices — select the correct answer with the radio button *
              </label>
              {form.choices.map((choice, i) => (
                <div key={i} className="choice-row">
                  <input
                    type="radio"
                    name="correct"
                    title="Mark as correct"
                    checked={choice.is_correct}
                    onChange={() => setCorrectChoice(i)}
                  />
                  <input
                    type="text"
                    placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                    value={choice.text}
                    onChange={e => setChoiceText(i, e.target.value)}
                    style={{ flex:1 }}
                  />
                  {choice.is_correct && <span className="tag green" style={{ whiteSpace:'nowrap' }}>✓ Correct</span>}
                </div>
              ))}

              <div className="btn-group mt-2">
                <button className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing === 'new' ? 'Add Question' : 'Update Question'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setError('') }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions list */}
        <div>
          {questions.length === 0 && editing === null && (
            <div className="empty">
              <p>No questions yet.</p>
              <button className="btn btn-primary mt-2" onClick={openNew}>Add First Question</button>
            </div>
          )}
          {questions.map((q, idx) => (
            <div key={q.id} className="question-item">
              <h4>
                <span>Q{idx + 1}. {q.text}</span>
                <div className="btn-group">
                  <span className="tag blue">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(q)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q.id)}>Delete</button>
                </div>
              </h4>
              {q.choices.map((c, ci) => (
                <div key={c.id} style={{
                  display:'flex', gap:'.5rem', alignItems:'center',
                  padding:'.3rem .5rem', borderRadius:'4px', marginBottom:'.2rem',
                  background: c.is_correct ? 'var(--success-light)' : 'var(--gray-50)',
                }}>
                  <span style={{ fontWeight:600, color: c.is_correct?'var(--success)':'var(--gray-400)', minWidth:'16px' }}>
                    {c.is_correct ? '✓' : String.fromCharCode(65 + ci)}
                  </span>
                  <span style={{ fontSize:'.9rem', color: c.is_correct?'var(--success)':'var(--gray-700)' }}>{c.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

