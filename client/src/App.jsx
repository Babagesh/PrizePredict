import { useEffect, useState, useRef } from 'react'
import './App.css'
import RAW_TEMPLATES from './assets/parlayTemplates.json'

const API_BASE = 'http://localhost:8000'
const USER_ID = 'demo_user'
const SPORTS = ['basketball', 'soccer', 'football']

// Imported mock templates JSON: RAW_TEMPLATES

async function fetchJSON(url, opts) { const res = await fetch(url, opts); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json() }

function App() {
  const [activeTab, setActiveTab] = useState('basketball')
  const [templates, setTemplates] = useState({ basketball: [], soccer: [], football: [] })
  const [submitted, setSubmitted] = useState([])
  const [history, setHistory] = useState([])
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState({ templates: false, submit: false, predict: false })
  const pollRef = useRef(null)

  useEffect(() => { loadTemplates(activeTab) }, [activeTab])
  useEffect(() => { startPolling(); return () => stopPolling() }, [])

  function startPolling() {
    const poll = async () => {
      try {
        const s = await fetchJSON(`${API_BASE}/api/parlays/submitted?user_id=${USER_ID}`)
        setSubmitted(s)
        const h = await fetchJSON(`${API_BASE}/api/parlays/history?user_id=${USER_ID}`)
        setHistory(h)
      } catch {}
    }
    poll(); pollRef.current = setInterval(poll, 5000)
  }
  function stopPolling() { if (pollRef.current) clearInterval(pollRef.current) }

  async function loadTemplates(sport) {
    if (!SPORTS.includes(sport) || templates[sport].length) return
    setLoading(l => ({ ...l, templates: true }))
    // Try backend; if fails, fallback to local
    try {
      const data = await fetchJSON(`${API_BASE}/api/parlays/templates?sport=${sport}`)
      setTemplates(prev => ({ ...prev, [sport]: (data.items || data || []).map(enhanceTemplate) }))
    } catch {
      setTemplates(prev => ({ ...prev, [sport]: (RAW_TEMPLATES[sport] || []).map(enhanceTemplate) }))
    } finally { setLoading(l => ({ ...l, templates: false })) }
  }

  function enhanceTemplate(t) {
    // Add UI state per-leg (userDirection) defaulting to template direction
    return { ...t, legs: t.legs.map(l => ({ ...l, userDirection: l.direction || 'over' })) }
  }

  async function submitTemplate(t) {
    if (!t) return
    const payload = {
      user_id: USER_ID,
      source: 'template',
      sport: t.sport,
      legs: t.legs.map(l => ({
        player_id: l.player_id,
        player_name: l.player_name,
        sport: t.sport,
        stat: l.stat,
        direction: l.userDirection || l.direction || 'over',
        line: l.line,
        base_prob: l.base_prob
      }))
    }
    setLoading(l => ({ ...l, submit: true }))
    try {
      // Attempt backend submit
      await fetchJSON(`${API_BASE}/api/parlays/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const s = await fetchJSON(`${API_BASE}/api/parlays/submitted?user_id=${USER_ID}`)
      setSubmitted(s)
    } catch {
      // Local fallback: stage into submitted with synthetic id
      const local = { id: `local-${Date.now()}`, created_at: Date.now(), parlay_result: null, legs: payload.legs }
      setSubmitted(prev => [local, ...prev])
    } finally {
      setLoading(l => ({ ...l, submit: false }))
      setActiveTab('submitted')
    }
  }

  async function predict() {
    setLoading(l => ({ ...l, predict: true }))
    try {
      const resp = await fetchJSON(`${API_BASE}/api/parlays/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: USER_ID, count: 3, mix: true }) })
      setRecommended(resp.recommendations || [])
    } catch { alert('Prediction failed') } finally { setLoading(l => ({ ...l, predict: false })) }
  }

  async function submitRecommended(r) {
    try {
      await fetchJSON(`${API_BASE}/api/parlays/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: USER_ID, source: 'prediction', legs: r.legs.map(l => ({ player_id: l.player_id, player_name: l.player_name, sport: l.sport, stat: l.stat, direction: l.direction, line: l.line, base_prob: l.base_prob })) }) })
      setActiveTab('history')
    } catch { alert('Submit failed') }
  }

  return (
    <div className="layout-root fade-in">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      {SPORTS.includes(activeTab) && (
        <TemplatesView sport={activeTab} templates={templates[activeTab]} loading={loading.templates} submitTemplate={submitTemplate} />
      )}
      {activeTab === 'history' && (<HistoryView history={history} />)}
      {activeTab === 'predict' && (<PredictView recommendations={recommended} submitRecommended={submitRecommended} loading={loading.predict} onPredict={predict} />)}
      {activeTab === 'submitted' && (<SubmittedView submitted={submitted} />)}
    </div>
  )
}

function Header({ activeTab, setActiveTab }) {
  const mainTabs = [...SPORTS, 'submitted', 'history', 'predict']
  return (
    <div className="app-header-bar">
      {mainTabs.map(t => (
        <button key={t} onClick={() => setActiveTab(t)} className={activeTab === t ? 'active' : ''}>{capitalize(t)}</button>
      ))}
    </div>
  )
}

function TemplatesView({ sport, templates, loading, submitTemplate }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">{capitalize(sport)} Parlays</h3>
      {loading && <div className="empty-label">Loading...</div>}
      <ParlayGrid rows={templates} emptyLabel="No templates" actionLabel="Submit" onAction={submitTemplate} allowDirectionSelect />
    </div>
  )
}

function SubmittedView({ submitted }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">Submitted (Pending)</h3>
      <ParlayGrid rows={submitted} emptyLabel="No pending" />
    </div>
  )
}

function HistoryView({ history }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">History</h3>
      <ParlayGrid rows={history} emptyLabel="No history" showOutcome outcomeStyling />
    </div>
  )
}

function PredictView({ recommendations, submitRecommended, loading, onPredict }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h3 className="section-title">Recommended Parlays</h3>
        <button onClick={onPredict} disabled={loading} className="btn-accent" style={{ fontSize: '0.7rem' }}>
          {loading ? 'Predicting...' : 'Predict Future Parlay'}
        </button>
      </div>
      {loading && <div className="empty-label">Generating...</div>}
      <ParlayGrid rows={recommendations} emptyLabel="No recommendations yet" actionLabel="Submit" onAction={submitRecommended} highlight="recommend" showScore />
    </div>
  )
}

function ParlayGrid({ rows, emptyLabel = 'Empty', actionLabel, onAction, highlight, showOutcome, outcomeStyling, showScore, allowDirectionSelect }) {
  if (!rows || rows.length === 0) return <div className="empty-label">{emptyLabel}</div>
  return (
    <div className="panels-grid">
      {rows.map(r => {
        const win = r.parlay_result === 'WIN'
        const lose = r.parlay_result === 'LOSS'
        const cls = [
          'parlay-card',
          highlight === 'recommend' ? 'recommend' : '',
          outcomeStyling && win ? 'win' : '',
          outcomeStyling && lose ? 'loss' : ''
        ].filter(Boolean).join(' ')
        return (
          <div key={r.id} className={cls}>
            <div className="parlay-card-header">
              <strong>{(r.id || '').slice(0, 8)}</strong>
              {showOutcome && (
                <span className={win ? 'status-win' : (lose ? 'status-loss' : 'status-pending')}>
                  {r.parlay_result || 'PENDING'}
                </span>
              )}
              {showScore && r.score != null && <span className="score-chip">{r.score.toFixed(2)}</span>}
            </div>
            <ul className="legs-list">
              {r.legs.map((l, i) => (
                <li key={i} className="leg-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{shortName(l.player_name)} {shortStat(l.stat)}</span>
                    <span style={{ color: '#ffc107' }}>{l.line}</span>
                  </div>
                  {allowDirectionSelect ? (
                    <select
                      value={l.userDirection || l.direction || 'over'}
                      onChange={e => {
                        const val = e.target.value
                        if (!allowDirectionSelect) return
                        const sport = r.sport || (r.legs[0] && r.legs[0].sport)
                        if (sport) {
                          // update template leg immutably
                          setTemplates(prev => ({
                            ...prev,
                            [sport]: prev[sport].map(tpl => tpl.id === r.id ? { ...tpl, legs: tpl.legs.map((leg, idx) => idx === i ? { ...leg, userDirection: val } : leg) } : tpl)
                          }))
                        }
                      }}
                      style={{
                        marginTop: 4,
                        padding: '4px 6px',
                        background: '#273038',
                        color: 'var(--text)',
                        border: '1px solid #38424d',
                        borderRadius: 4,
                        fontSize: '0.65rem'
                      }}
                    >
                      <option value="over">Over</option>
                      <option value="under">Under</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.6rem', opacity: 0.8 }}>{(l.direction || 'over').toUpperCase()}</span>
                  )}
                </li>
              ))}
            </ul>
            {actionLabel && onAction && (
              <button onClick={() => onAction(r)} className="card-action-btn">{actionLabel}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
function shortName(n) { if (!n) return ''; const p = n.split(' '); return p.length > 1 ? p[0][0] + '. ' + p.slice(1).join(' ') : n }
function shortStat(stat) { switch (stat) { case 'passing_yards': return 'PassY'; case 'rushing_yards': return 'RushY'; case 'receiving_yards': return 'RecY'; default: return stat } }

export default App
