const BASE = {
  auth:   '/api/auth',
  exams:  '/api/exams',
  results:'/api/results',
};

function getToken() {
  return localStorage.getItem('access_token');
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = data.detail || Object.values(data).flat().join(' ') || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (body)    => request(`${BASE.auth}/login/`, { method:'POST', body: JSON.stringify(body) }),
  register: (body)    => request(`${BASE.auth}/register/`, { method:'POST', body: JSON.stringify(body) }),
  me:       ()        => request(`${BASE.auth}/me/`),
  users:    (role='') => request(`${BASE.auth}/users/${role ? `?role=${role}` : ''}`),
  deleteUser: (id)    => request(`${BASE.auth}/users/${id}/`, { method:'DELETE' }),
};

// ── Exams ─────────────────────────────────────────────────────────────────────
export const examApi = {
  list:            ()          => request(`${BASE.exams}/`),
  get:             (id)        => request(`${BASE.exams}/${id}/`),
  create:          (body)      => request(`${BASE.exams}/`, { method:'POST', body: JSON.stringify(body) }),
  update:          (id, body)  => request(`${BASE.exams}/${id}/`, { method:'PATCH', body: JSON.stringify(body) }),
  delete:          (id)        => request(`${BASE.exams}/${id}/`, { method:'DELETE' }),

  getQuestions:    (examId)          => request(`${BASE.exams}/${examId}/questions/`),
  addQuestion:     (examId, body)    => request(`${BASE.exams}/${examId}/questions/`, { method:'POST', body: JSON.stringify(body) }),
  updateQuestion:  (examId, qId, b)  => request(`${BASE.exams}/${examId}/questions/${qId}/`, { method:'PUT', body: JSON.stringify(b) }),
  deleteQuestion:  (examId, qId)     => request(`${BASE.exams}/${examId}/questions/${qId}/`, { method:'DELETE' }),

  start:           (examId)    => request(`${BASE.exams}/${examId}/start/`, { method:'POST' }),
  submit:          (examId, b) => request(`${BASE.exams}/${examId}/submit/`, { method:'POST', body: JSON.stringify(b) }),

  mySubmissions:   ()          => request(`${BASE.exams}/my-submissions/`),
  allSubmissions:  (examId='') => request(`${BASE.exams}/submissions/${examId ? `?exam_id=${examId}` : ''}`),
};

// ── Results ───────────────────────────────────────────────────────────────────
export const resultApi = {
  list:        (examId='') => request(`${BASE.results}/list/${examId ? `?exam_id=${examId}` : ''}`),
  bySubmission:(subId)     => request(`${BASE.results}/submission/${subId}/`),
  leaderboard: (examId)    => request(`${BASE.results}/leaderboard/?exam_id=${examId}`),
};

