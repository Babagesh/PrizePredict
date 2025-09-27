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
  const [submitted, setSubmitted] = useState([]) // (legacy: unused for new flow)
  const [history, setHistory] = useState([])
  const [recommended, setRecommended] = useState([])
  const [builder, setBuilder] = useState([]) // current parlay legs prior to final submit
  const MAX_LEGS = 6
  const MIN_LEGS = 2
  const [loading, setLoading] = useState({ templates: false, submit: false, predict: false })
  const pollRef = useRef(null)
  const resolveTimers = useRef({}) // legacy (no longer used after refactor)

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
    let raw = []
    try {
      const data = await fetchJSON(`${API_BASE}/api/parlays/templates?sport=${sport}`)
      raw = data.items || data || []
    } catch {
      raw = RAW_TEMPLATES[sport] || []
    } finally {
      // Detect new per-player schema (presence of markets) and map directly; otherwise aggregate legacy multi-leg templates
      let markets
      if (raw.length && raw[0].markets) {
        markets = raw.map(p => {
          const statKeys = Object.keys(p.markets)
          // unify shape with previous market object expected by UI
            const statOptions = statKeys.slice(0,2).map(k => ({ stat: k, lines: p.markets[k] }))
            const selectedStat = statOptions[0]?.stat || null
            const selectedLine = statOptions[0]?.lines[0] || null
            return {
              id: p.id,
              player_id: p.player_id,
              player_name: p.player_name,
              sport: p.sport || sport,
              statOptions,
              selectedStat,
              selectedLine,
              direction: 'over',
              base_prob_map: p.base_prob || {}
            }
        })
      } else {
        markets = buildPlayerMarkets(raw, sport)
      }
      setTemplates(prev => ({ ...prev, [sport]: markets }))
      setLoading(l => ({ ...l, templates: false }))
    }
  }

  function buildPlayerMarkets(templateArray, sport) {
    // Aggregate by player; collect stats and lines; limit to two stat types per player.
    const byPlayer = {}
    templateArray.forEach(t => {
      t.legs.forEach(leg => {
        const pid = leg.player_id || leg.player_name
        if (!byPlayer[pid]) byPlayer[pid] = { player_id: leg.player_id, player_name: leg.player_name, sport: leg.sport || sport, stats: {} }
        if (!byPlayer[pid].stats[leg.stat]) byPlayer[pid].stats[leg.stat] = new Set()
        byPlayer[pid].stats[leg.stat].add(leg.line)
      })
    })
    const markets = Object.values(byPlayer).map(p => {
      // Choose up to two stat keys deterministically (alphabetical for consistency)
      const statKeys = Object.keys(p.stats).sort().slice(0,2)
      const market = {
        id: `${p.player_id || p.player_name}-${statKeys.join('-')}`,
        player_id: p.player_id,
        player_name: p.player_name,
        sport: p.sport,
        statOptions: statKeys.map(k => ({ stat: k, lines: Array.from(p.stats[k]).sort((a,b)=>a-b) })),
        selectedStat: null,
        selectedLine: null,
        direction: 'over'
      }
      // default select first stat & first line
      if (market.statOptions.length) {
        market.selectedStat = market.statOptions[0].stat
        market.selectedLine = market.statOptions[0].lines[0]
      }
      return market
    })
    return markets
  }

  function enhanceTemplate(t) {
    // Merge multiple legs for same player into a single leg with up to two stat options
    const groups = {}
    t.legs.forEach(l => {
      const key = (l.player_id || l.player_name) + '|' + (l.sport || t.sport)
      if (!groups[key]) groups[key] = []
      groups[key].push(l)
    })
    const merged = Object.values(groups).map(list => {
      const primary = { ...list[0] }
      if (list.length > 1) {
        // Take first two distinct stats as options
        const distinct = []
        const seen = new Set()
        for (const leg of list) {
          if (!seen.has(leg.stat)) { distinct.push(leg); seen.add(leg.stat) }
          if (distinct.length === 2) break
        }
        if (distinct.length === 1) {
          // Fallback: synthesize second via normalize later
          primary.categoryOptions = [{ stat: distinct[0].stat, line: distinct[0].line, base_prob: distinct[0].base_prob }]
        } else {
          primary.categoryOptions = distinct.map(d => ({ stat: d.stat, line: d.line, base_prob: d.base_prob }))
        }
      }
      return primary
    })
    return { ...t, legs: merged.map(l => normalizeLeg(l)) }
  }

  function normalizeLeg(l) {
    // Guarantee exactly two distinct stat options (primary + alt). If alt resolves same as primary, generate synthetic alt key with suffix.
    const primaryStat = l.stat
    const altMap = {
      points: 'rebounds', rebounds: 'points', assists: 'points', three_pointers_made: 'points',
      goals: 'shots_on_target', shots_on_target: 'goals', chances_created: 'assists',
      passing_yards: 'passing_touchdowns', passing_touchdowns: 'passing_yards',
      receiving_yards: 'receptions', receptions: 'receiving_yards',
      rushing_yards: 'rushing_attempts', rushing_attempts: 'rushing_yards'
    }
    let altStat = altMap[primaryStat] || primaryStat
    if (altStat === primaryStat) altStat = primaryStat + '_alt'
    const baseLine = l.line
    const altLine = deriveAltLine(primaryStat, altStat, baseLine)
    let categoryOptions = l.categoryOptions
    if (!categoryOptions) {
      categoryOptions = [
        { stat: primaryStat, line: baseLine, base_prob: l.base_prob },
        { stat: altStat, line: altLine.line, base_prob: altLine.prob }
      ]
    } else {
      // Trim/extract only first two; ensure distinct
      categoryOptions = categoryOptions.slice(0,2)
      if (categoryOptions.length === 1) {
        categoryOptions.push({ stat: altStat, line: altLine.line, base_prob: altLine.prob })
      } else if (categoryOptions[0].stat === categoryOptions[1].stat) {
        categoryOptions[1] = { stat: altStat, line: altLine.line, base_prob: altLine.prob }
      }
    }
    const selected = categoryOptions[0]
    return { ...l, userDirection: l.direction || 'over', selectedStat: selected.stat, selectedLine: selected.line, selectedProb: selected.base_prob, categoryOptions }
  }

  function deriveAltLine(primary, alt, baseLine) {
    // Make simple numeric adjustments depending on stat families
    const adjust = (deltaPct) => ({ line: +(baseLine * (1 + deltaPct)).toFixed(1), prob: clampProb( (0.5 + (Math.random()*0.08 - 0.04)) ) })
    if (primary === alt) return { line: baseLine, prob: clampProb( (0.5 + (Math.random()*0.1 - 0.05)) ) }
    if (/points/.test(primary) || /points/.test(alt)) return adjust(-0.15)
    if (/assists/.test(primary) || /assists/.test(alt)) return adjust(0.20)
    if (/rebounds/.test(primary) || /rebounds/.test(alt)) return adjust(-0.1)
    if (/shots_on_target/.test(primary) || /goals/.test(primary) || /goals/.test(alt)) return adjust(0.30)
    if (/passing_yards/.test(primary) || /passing_touchdowns/.test(primary)) return adjust(0.05)
    if (/rushing_yards/.test(primary)) return adjust(0.07)
    return adjust(0.0)
  }

  function clampProb(p) { return Math.min(0.9, Math.max(0.1, p)) }

  function addTemplateToBuilder(t) {
    if (!t) return
    // Prepare legs with current selections
    const newLegs = t.legs.map(l => ({
      ...l,
      stat: l.selectedStat || l.stat,
      line: l.selectedLine || l.line,
      base_prob: l.selectedProb ?? l.base_prob,
      direction: (l.userDirection || l.direction || 'over').toLowerCase()
    }))
    setBuilder(prev => {
      const combined = [...prev, ...newLegs]
      if (combined.length > MAX_LEGS) {
        alert(`Parlay cannot exceed ${MAX_LEGS} legs. Extra legs ignored.`)
        return combined.slice(0, MAX_LEGS)
      }
      return combined
    })
    setActiveTab('submitted')
  }

  function updateBuilderLeg(idx, patch) {
    setBuilder(prev => prev.map((leg, i) => i === idx ? { ...leg, ...patch } : leg))
  }

  function removeBuilderLeg(idx) {
    setBuilder(prev => prev.filter((_, i) => i !== idx))
  }

  function finalizeParlay() {
    if (builder.length < MIN_LEGS) {
      alert(`Need at least ${MIN_LEGS} legs to submit`)
      return
    }
    if (builder.length > MAX_LEGS) {
      alert(`Max ${MAX_LEGS} legs allowed`)
      return
    }
    // Simulate outcomes immediately (no async delay now)
    const resolvedLegs = builder.map(leg => {
      const raw = typeof leg.base_prob === 'number' ? leg.base_prob : 0.5
      const dir = (leg.direction || 'over').toLowerCase()
      let p = dir === 'over' ? raw : (1 - raw)
      p = Math.min(0.92, Math.max(0.08, p + (Math.random() * 0.06 - 0.03)))
      const hit = Math.random() < p
      return { ...leg, hit, simulated_prob: p }
    })
    const win = resolvedLegs.every(l => l.hit)
    const parlay = { id: `parlay-${Date.now()}`, created_at: Date.now(), parlay_result: win ? 'WIN' : 'LOSS', legs: resolvedLegs }
    setHistory(h => [parlay, ...h])
    setBuilder([])
    setActiveTab('history')
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

  // Legacy resolution timers removed in new flow

  return (
    <div className="layout-root fade-in">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      {SPORTS.includes(activeTab) && (
        <TemplatesView
          sport={activeTab}
          templates={templates[activeTab]}
          loading={loading.templates}
          addTemplate={addTemplateToBuilder}
          updateTemplates={setTemplates}
        />
      )}
      {activeTab === 'history' && (<HistoryView history={history} />)}
      {activeTab === 'predict' && (<PredictView recommendations={recommended} submitRecommended={submitRecommended} loading={loading.predict} onPredict={predict} />)}
      {activeTab === 'submitted' && (<BuilderView builder={builder} updateLeg={updateBuilderLeg} removeLeg={removeBuilderLeg} finalizeParlay={finalizeParlay} MIN_LEGS={MIN_LEGS} MAX_LEGS={MAX_LEGS} />)}
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

function TemplatesView({ sport, templates, loading, addTemplate, updateTemplates }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">{capitalize(sport)} Player Markets</h3>
      {loading && <div className="empty-label">Loading...</div>}
      {(!templates || templates.length === 0) && !loading && <div className="empty-label">No markets</div>}
      <div className="panels-grid">
        {templates.map(m => (
          <div key={m.id} className="parlay-card">
            <div className="parlay-card-header">
              <strong>{shortName(m.player_name)}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={m.selectedStat}
                  onChange={e => {
                    const newStat = e.target.value
                    updateTemplates(prev => ({
                      ...prev,
                      [sport]: prev[sport].map(x => {
                        if (x.id !== m.id) return x
                        const opt = x.statOptions.find(o => o.stat === newStat)
                        const firstLine = opt.lines[0]
                        return { ...x, selectedStat: newStat, selectedLine: firstLine }
                      })
                    }))
                  }}
                  style={{ flex: 1, padding: '4px 6px', background: '#273038', color: 'var(--text)', border: '1px solid #38424d', borderRadius: 4, fontSize: '0.65rem' }}
                >
                  {m.statOptions.map(o => <option key={o.stat} value={o.stat}>{shortStat(o.stat)}</option>)}
                </select>
                <span style={{ width: 60, textAlign: 'right', color: '#ffc107', fontSize: '0.65rem' }}>{m.selectedLine}</span>
                <select
                  value={m.direction}
                  onChange={e => {
                    const dir = e.target.value
                    updateTemplates(prev => ({
                      ...prev,
                      [sport]: prev[sport].map(x => x.id === m.id ? { ...x, direction: dir } : x)
                    }))
                  }}
                  style={{ width: 62, padding: '4px 6px', background: '#273038', color: 'var(--text)', border: '1px solid #38424d', borderRadius: 4, fontSize: '0.65rem' }}
                >
                  <option value="over">Over</option>
                  <option value="under">Under</option>
                </select>
              </div>
              <button
                onClick={() => addTemplate(mToTemplate(m))}
                className="card-action-btn"
              >Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function mToTemplate(market) {
  // Convert market selection into template-like object with single leg for add flow
  const bp = (market.base_prob_map && market.base_prob_map[market.selectedStat]) || 0.55
  return {
    id: market.id,
    sport: market.sport,
    legs: [
      {
        player_id: market.player_id,
        player_name: market.player_name,
        sport: market.sport,
        stat: market.selectedStat,
        line: market.selectedLine,
        base_prob: bp,
        direction: market.direction
      }
    ]
  }
}

function BuilderView({ builder, updateLeg, removeLeg, finalizeParlay, MIN_LEGS, MAX_LEGS }) {
  const canSubmit = builder.length >= MIN_LEGS && builder.length <= MAX_LEGS
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">Current Parlay Builder ({builder.length}/{MAX_LEGS})</h3>
      {builder.length === 0 && <div className="empty-label">Add legs from sport tabs</div>}
      {builder.length > 0 && (
        <div className="parlay-card" style={{ border: '1px solid #2f3a44' }}>
          <ul className="legs-list">
            {builder.map((l, i) => (
              <li key={i} className="leg-row" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                <span style={{ minWidth: 70, fontSize: '0.65rem' }}>{shortName(l.player_name)}</span>
                <span style={{ flex: 1, fontSize: '0.6rem' }}>{shortStat(l.selectedStat || l.stat)}</span>
                <span style={{ width: 46, textAlign: 'right', color: '#ffc107', fontSize: '0.65rem' }}>{l.selectedLine || l.line}</span>
                <select
                  value={l.direction || l.userDirection || 'over'}
                  onChange={e => updateLeg(i, { direction: e.target.value })}
                  style={{ width: '60px', padding: '4px 6px', background: '#273038', color: 'var(--text)', border: '1px solid #38424d', borderRadius: 4, fontSize: '0.6rem' }}
                >
                  <option value="over">Over</option>
                  <option value="under">Under</option>
                </select>
                <button onClick={() => removeBuilderLeg(i)} style={{ background: '#3a464f', color: '#bbb', border: '1px solid #48545e', borderRadius: 4, fontSize: '0.55rem', padding: '4px 6px' }}>X</button>
              </li>
            ))}
          </ul>
          <button onClick={finalizeParlay} disabled={!canSubmit} className="card-action-btn" style={{ marginTop: 8, opacity: canSubmit ? 1 : 0.5 }}>
            Submit Parlay
          </button>
          {!canSubmit && <div style={{ fontSize: '0.55rem', marginTop: 4, opacity: 0.7 }}>Need {MIN_LEGS}-{MAX_LEGS} legs</div>}
        </div>
      )}
    </div>
  )
}

function HistoryView({ history }) {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h3 className="section-title">History</h3>
      <ParlayGrid rows={history} emptyLabel="No history" showOutcome outcomeStyling showSimulated />
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

function ParlayGrid({ rows, emptyLabel = 'Empty', actionLabel, onAction, highlight, showOutcome, outcomeStyling, showScore, allowDirectionSelect, showSimulated }) {
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
                <li key={i} className="leg-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    {!allowDirectionSelect && (
                      <>
                        <span>{shortName(l.player_name)} {shortStat(l.selectedStat || l.stat)}</span>
                        <span style={{ color: '#ffc107' }}>{l.selectedLine || l.line}{showSimulated && l.simulated_prob != null && <em style={{ fontStyle: 'normal', marginLeft: 6, color: '#8ca3b7', fontSize: '0.55rem' }}>{(l.simulated_prob*100).toFixed(0)}%</em>}</span>
                      </>
                    )}
                  </div>
                  {allowDirectionSelect ? (
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                      <span style={{ minWidth: 60, fontSize: '0.6rem' }}>{shortName(l.player_name)}</span>
                      <select
                        value={l.selectedStat || l.stat}
                        onChange={e => {
                          const statVal = e.target.value
                          const sport = r.sport || (r.legs[0] && r.legs[0].sport)
                          if (!sport) return
                          setTemplates(prev => ({
                            ...prev,
                            [sport]: prev[sport].map(tpl => tpl.id === r.id ? {
                              ...tpl,
                              legs: tpl.legs.map((leg, idx) => {
                                if (idx !== i) return leg
                                const opt = leg.categoryOptions.find(o => o.stat === statVal) || leg.categoryOptions[0]
                                return { ...leg, selectedStat: opt.stat, selectedLine: opt.line, selectedProb: opt.base_prob }
                              })
                            } : tpl)
                          }))
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          background: '#273038',
                          color: 'var(--text)',
                          border: '1px solid #38424d',
                          borderRadius: 4,
                          fontSize: '0.6rem'
                        }}
                      >
                        {l.categoryOptions && l.categoryOptions.map(o => (
                          <option key={o.stat} value={o.stat}>{shortStat(o.stat)}</option>
                        ))}
                      </select>
                      <span style={{ width: 42, textAlign: 'right', color: '#ffc107', fontSize: '0.6rem' }}>{l.selectedLine || l.line}</span>
                      <select
                        value={l.userDirection || l.direction || 'over'}
                        onChange={e => {
                          const val = e.target.value
                          const sport = r.sport || (r.legs[0] && r.legs[0].sport)
                          if (!sport) return
                          setTemplates(prev => ({
                            ...prev,
                            [sport]: prev[sport].map(tpl => tpl.id === r.id ? {
                              ...tpl,
                              legs: tpl.legs.map((leg, idx) => idx === i ? { ...leg, userDirection: val } : leg)
                            } : tpl)
                          }))
                        }}
                        style={{
                          width: '58px',
                          padding: '4px 6px',
                          background: '#273038',
                          color: 'var(--text)',
                          border: '1px solid #38424d',
                          borderRadius: 4,
                          fontSize: '0.6rem'
                        }}
                      >
                        <option value="over">Over</option>
                        <option value="under">Under</option>
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', opacity: 0.85 }}>
                      <span>{(l.direction || 'over').toUpperCase()}</span>
                      {showOutcome && l.hit != null && (
                        <span style={{ color: l.hit ? '#4caf50' : '#ff5252', fontWeight: 600 }}>{l.hit ? 'HIT' : 'MISS'}</span>
                      )}
                    </div>
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
