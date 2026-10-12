import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/complaints`;
const STATUS = {
  YET_TO_BE_REVIEWED: { label: 'Yet to be reviewed', className: 'review' },
  IN_PROGRESS: { label: 'In progress', className: 'progress' },
  DONE: { label: 'Done', className: 'done' }
};
const prettyDate = (value) => value ? new Date(value).toLocaleString() : 'Just now';

const MINE_KEY = 'myComplaintIds';
const ADMIN_KEY = 'adminPassword';
const readStore = (store, key) => { try { return store.getItem(key); } catch { return null; } };
const writeStore = (store, key, value) => { try { value == null ? store.removeItem(key) : store.setItem(key, value); } catch { /* storage unavailable */ } };
const readMineIds = () => { try { return JSON.parse(readStore(localStorage, MINE_KEY) || '[]'); } catch { return []; } };

function App() {
  const [page, setPage] = useState('student');
  const [complaints, setComplaints] = useState([]);
  const [mine, setMine] = useState([]);
  const [adminPassword, setAdminPassword] = useState(() => readStore(sessionStorage, ADMIN_KEY) || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState({ studentName: '', studentEmail: '', subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const adminHeaders = (password) => ({ 'X-Admin-Password': password });

  function logoutAdmin() {
    writeStore(sessionStorage, ADMIN_KEY, null);
    setAdminPassword(''); setPasswordInput(''); setComplaints([]);
  }

  // Students only ever see the complaints submitted from this browser.
  async function loadMine() {
    const ids = readMineIds();
    if (!ids.length) { setMine([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API}/track?ids=${ids.join(',')}`);
      if (!response.ok) throw new Error('Could not load complaints.');
      setMine(await response.json());
    } catch {
      setError('Cannot connect to the server right now. It may be waking up, so please try again in a minute.');
    } finally { setLoading(false); }
  }

  async function loadAdminComplaints(password = adminPassword) {
    if (!password) return false;
    setLoading(true); setError('');
    try {
      const response = await fetch(API, { headers: adminHeaders(password) });
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        logoutAdmin();
        setError(response.status === 401 ? 'Incorrect admin password.'
          : response.status === 429 ? 'Too many failed attempts. Please wait 15 minutes and try again.'
          : 'Admin access is not configured on the server.');
        return false;
      }
      if (!response.ok) throw new Error('Could not load complaints.');
      setComplaints(await response.json());
      return true;
    } catch {
      setError('Cannot connect to the server right now. It may be waking up, so please try again in a minute.');
      return false;
    } finally { setLoading(false); }
  }

  async function loginAdmin(event) {
    event.preventDefault();
    const password = passwordInput;
    if (await loadAdminComplaints(password)) {
      writeStore(sessionStorage, ADMIN_KEY, password);
      setAdminPassword(password); setPasswordInput('');
    }
  }

  const refresh = () => (page === 'admin' ? loadAdminComplaints() : loadMine());

  useEffect(() => { loadMine(); }, []);
  useEffect(() => { if (page === 'admin' && adminPassword) loadAdminComplaints(); }, [page]);

  const countsOf = (list) => ({
    all: list.length,
    review: list.filter(c => c.status === 'YET_TO_BE_REVIEWED').length,
    progress: list.filter(c => c.status === 'IN_PROGRESS').length,
    done: list.filter(c => c.status === 'DONE').length
  });
  const counts = useMemo(() => countsOf(page === 'admin' ? complaints : mine), [page, complaints, mine]);

  const visible = useMemo(() => complaints.filter(c => {
    const text = `${c.subject} ${c.studentName} ${c.studentEmail} ${c.description}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (filter === 'ALL' || c.status === filter);
  }), [complaints, search, filter]);

  async function submitComplaint(event) {
    event.preventDefault(); setSubmitting(true); setError(''); setNotice('');
    try {
      const response = await fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(response.status === 429 && data.message ? data.message : 'Please check your details and try again.');
      }
      const created = await response.json();
      writeStore(localStorage, MINE_KEY, JSON.stringify([...readMineIds(), created.id]));
      setForm({ studentName: '', studentEmail: '', subject: '', description: '' });
      setNotice('Your complaint has been submitted successfully.');
      await loadMine();
    } catch (e) { setError(e.message || 'Unable to submit complaint.'); }
    finally { setSubmitting(false); }
  }

  async function changeStatus(id, status) {
    setError(''); setNotice('');
    try {
      const response = await fetch(`${API}/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...adminHeaders(adminPassword) }, body: JSON.stringify({ status })
      });
      if (response.status === 401 || response.status === 403) { logoutAdmin(); throw new Error('Admin session expired. Please log in again.'); }
      if (!response.ok) throw new Error('Status update failed.');
      const updated = await response.json();
      setComplaints(current => current.map(c => c.id === id ? updated : c));
      setNotice(`Complaint #${id} updated to ${STATUS[status].label}.`);
    } catch (e) { setError(e.message || 'Could not update status.'); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><GraduationCap size={23}/></div><div><strong>Campus Voice</strong><span>Student support portal</span></div></div>
      <div className="nav-label">WORKSPACE</div>
      <button className={`nav-item ${page === 'student' ? 'active' : ''}`} onClick={() => {setPage('student'); setError('');}}><Plus size={18}/> Submit a complaint</button>
      <button className={`nav-item ${page === 'admin' ? 'active' : ''}`} onClick={() => {setPage('admin'); setError('');}}><LayoutDashboard size={18}/> Admin dashboard</button>
      <div className="sidebar-bottom"><div className="secure-icon"><ShieldCheck size={18}/></div><div><b>Every voice matters</b><span>Track issues. Make progress.</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Campus / <b>{page === 'student' ? 'Student portal' : 'Admin dashboard'}</b></div><div className="profile"><div className="avatar">{page === 'student' ? 'ST' : 'AD'}</div><span>{page === 'student' ? 'Student' : 'Administrator'}</span></div></header>
      <div className="content">
        {page === 'student' ? <>
          <div className="page-heading"><div><div className="eyebrow">STUDENT SERVICES</div><h1>Make your voice heard.</h1><p>Tell us what needs attention. We'll keep you updated as it moves forward.</p></div><div className="heading-art"><ClipboardList size={38}/></div></div>
          <div className="stats-grid">
            <Stat icon={<ClipboardList/>} label="Total submitted" value={counts.all} tone="blue"/>
            <Stat icon={<AlertCircle/>} label="Awaiting review" value={counts.review} tone="amber"/>
            <Stat icon={<RefreshCw/>} label="In progress" value={counts.progress} tone="purple"/>
            <Stat icon={<CheckCircle2/>} label="Resolved" value={counts.done} tone="green"/>
          </div>
          <section className="panel form-panel"><div className="panel-title"><div><h2>Submit a complaint</h2><p>Share the details so the right team can help.</p></div><span className="required-note">* Required fields</span></div>
            <form onSubmit={submitComplaint}>
              <div className="form-grid">
                <Field label="Full name" required><input value={form.studentName} onChange={e=>setForm({...form,studentName:e.target.value})} placeholder="Enter your full name" maxLength="100" required /></Field>
                <Field label="College email" required><input type="email" value={form.studentEmail} onChange={e=>setForm({...form,studentEmail:e.target.value})} placeholder="you@college.edu" maxLength="150" required /></Field>
                <div className="full-width"><Field label="Complaint subject" required><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="e.g. Lab equipment not working" maxLength="150" required /></Field></div>
                <div className="full-width"><Field label="Describe the issue" required><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explain what happened, where it happened, and any helpful details..." minLength="10" maxLength="3000" rows="5" required/><span className="char-count">{form.description.length}/3000</span></Field></div>
              </div>
              <div className="form-footer"><span>Your complaint starts as <b>Yet to be reviewed</b>.</span><button className="primary-btn" disabled={submitting}>{submitting ? 'Submitting...' : <><Plus size={17}/> Submit complaint</>}</button></div>
            </form>
          </section>
          <section className="panel"><div className="panel-title"><div><h2>Your complaint activity</h2><p>Recent submissions and their current status.</p></div><button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button></div><ComplaintList complaints={mine} loading={loading} empty="Complaints you submit from this device will appear here."/></section>
        </> : !adminPassword ? <>
          <div className="page-heading"><div><div className="eyebrow">RESTRICTED AREA</div><h1>Admin login</h1><p>Enter the admin password to manage complaints.</p></div><div className="heading-art"><ShieldCheck size={38}/></div></div>
          <section className="panel form-panel"><form onSubmit={loginAdmin}>
            <Field label="Admin password" required><input type="password" value={passwordInput} onChange={e=>setPasswordInput(e.target.value)} placeholder="Enter admin password" autoComplete="current-password" required /></Field>
            <div className="form-footer"><span>Only administrators can view and update complaints.</span><button className="primary-btn" disabled={loading}>{loading ? 'Checking...' : 'Log in'}</button></div>
          </form></section>
        </> : <>
          <div className="page-heading"><div><div className="eyebrow">MANAGE STUDENT FEEDBACK</div><h1>Admin dashboard</h1><p>Review reports, update progress, and close resolved issues.</p></div><div><button className="secondary-btn refresh-btn" onClick={refresh}><RefreshCw size={16}/> Refresh</button> <button className="secondary-btn refresh-btn" onClick={logoutAdmin}>Log out</button></div></div>
          <div className="stats-grid">
            <Stat icon={<ClipboardList/>} label="All complaints" value={counts.all} tone="blue"/>
            <Stat icon={<AlertCircle/>} label="Yet to be reviewed" value={counts.review} tone="amber"/>
            <Stat icon={<RefreshCw/>} label="In progress" value={counts.progress} tone="purple"/>
            <Stat icon={<CheckCircle2/>} label="Done" value={counts.done} tone="green"/>
          </div>
          <section className="panel admin-panel"><div className="panel-title"><div><h2>Complaint register</h2><p>Update the status using the dropdown on each complaint.</p></div><span className="total-pill">{visible.length} records</span></div>
            <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search complaints, students..." /></div><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter status"><option value="ALL">All statuses</option><option value="YET_TO_BE_REVIEWED">Yet to be reviewed</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></div>
            {loading ? <div className="loading">Loading complaints...</div> : visible.length === 0 ? <div className="empty-state"><ClipboardList size={30}/><b>No complaints found</b><span>Try a different search or filter.</span></div> :
              <div className="admin-list">{visible.map(c=><article className="admin-card" key={c.id}><div className="admin-card-top"><div className="complaint-number">COMPLAINT #{String(c.id).padStart(4,'0')}</div><Status status={c.status}/></div><h3>{c.subject}</h3><p className="description">{c.description}</p><div className="meta-row"><span><b>{c.studentName}</b> · {c.studentEmail}</span><span>{prettyDate(c.createdAt)}</span></div><div className="status-control"><label htmlFor={`status-${c.id}`}>Update status</label><select id={`status-${c.id}`} value={c.status} onChange={e=>changeStatus(c.id,e.target.value)}><option value="YET_TO_BE_REVIEWED">Yet to be reviewed</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select>{c.status === 'DONE' && <span className="resolved-label"><CheckCircle2 size={15}/> Added to Done list</span>}</div></article>)}</div>}
          </section>
          <section className="panel done-panel"><div className="panel-title"><div><h2><CheckCircle2 size={20}/> Done list</h2><p>All complaints marked as resolved by the admin.</p></div><span className="done-count">{counts.done} done</span></div><ComplaintList complaints={complaints.filter(c=>c.status==='DONE')} loading={loading} empty="Resolved complaints will appear here when their status is set to Done."/></section>
        </>}
        {error && <div className="toast error"><AlertCircle size={18}/>{error}<button onClick={()=>setError('')}>×</button></div>}
        {notice && <div className="toast success"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
        <footer>Campus Voice <span>·</span> Student support, made simpler.</footer>
      </div>
    </main>
  </div>;
}

function Stat({icon,label,value,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function Field({label,required,children}) { return <label className="field"><span>{label}{required && <i> *</i>}</span>{children}</label>; }
function Status({status}) { const item=STATUS[status] || STATUS.YET_TO_BE_REVIEWED; return <span className={`status-badge ${item.className}`}><span/> {item.label}</span>; }
function ComplaintList({complaints,loading,empty}) {
  if (loading) return <div className="loading">Loading complaints...</div>;
  if (!complaints.length) return <div className="empty-state compact"><ClipboardList size={27}/><b>Nothing here yet</b><span>{empty}</span></div>;
  return <div className="activity-list">{complaints.slice(0,8).map(c=><div className="activity-row" key={c.id}><div className="activity-mark"><ClipboardList size={18}/></div><div className="activity-main"><b>{c.subject}</b><span>{c.studentName} · {prettyDate(c.createdAt)}</span><p>{c.description}</p></div><Status status={c.status}/></div>)}</div>;
}
export default App;
