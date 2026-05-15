'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Salaries = Record<string, number>
type Player = {
  id: string
  name: string
  club: string
  position: string
  nationality: string
  dob: string
  notes: string
  contract_type: string
  structure: string
  active_date: string
  guarantee_end: string
  opt1_end: string
  opt2_end: string
  contract_notes: string
  salaries: Salaries
  monthlies: Salaries
}

function fmt(n: number | undefined) {
  if (!n) return '—'
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function parseSal(s: string) {
  if (!s) return 0
  return parseInt(s.replace(/[^0-9]/g, '') || '0')
}
function fmtInput(s: string) {
  const v = s.replace(/[^0-9]/g, '')
  if (!v) return ''
  return '$' + Number(v).toLocaleString('en-US')
}
function getSal(p: Player, period: string): number {
  if (!p.salaries) return 0
  if (period === '2027s') return p.salaries['2027s'] || 0
  if (period === '2027r') return p.salaries['2027r'] || p.salaries['2027s'] || 0
  return p.salaries[period] || 0
}
function periodLabel(k: string) {
  const m: Record<string, string> = {
    '2026': '2026', '2027s': '2027 Sprint', '2027r': '2027 Regular',
    '2028': '2028', '2029': '2029 opt', '2030': '2030 opt'
  }
  return m[k] || k
}
function getPosBadge(pos: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    GK: { bg: '#e6f0eb', color: '#1e3a2f' },
    DEF: { bg: '#eaf0e6', color: '#27500A' },
    MID: { bg: '#f5f0e0', color: '#5a3a00' },
    FWD: { bg: '#f5e8e6', color: '#6b2020' },
  }
  const c = colors[pos] || colors.GK
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: '2px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', background: c.bg, color: c.color }}>{pos || '—'}</span>
  )
}
const S = {
  green: '#1e3a2f', greenMid: '#2d5240', greenLight: '#4a7c62',
  cream: '#f5f2ec', creamDark: '#ede9e0', gold: '#b8962e',
  text: '#1a1a18', muted: '#5a6e63', border: '#c8d4cc', sprint: '#7a3a1e',
}

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('roster')
  const [activePos, setActivePos] = useState('all')
  const [search, setSearch] = useState('')
  const [clubFilter, setClubFilter] = useState('')
  const [period, setPeriod] = useState('2026')
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [activeTab, setActiveTab] = useState('info')
  const [compPlayer, setCompPlayer] = useState('')
  const [compDepth, setCompDepth] = useState('1')
  const [compYear, setCompYear] = useState('2026')
  const [toast, setToast] = useState('')
  const [toastError, setToastError] = useState(false)
  const [parseStatus, setParseStatus] = useState('')
  const [parseProgress, setParseProgress] = useState(0)
  const [form, setForm] = useState<any>({})
  const router = useRouter()

  useEffect(() => { loadPlayers() }, [])

  async function loadPlayers() {
    setLoading(true)
    const { data, error } = await supabase.from('players').select('*').order('name')
    if (error) showToast(error.message, true)
    else setPlayers(data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function showToast(msg: string, isError = false) {
    setToast(msg); setToastError(isError)
    setTimeout(() => setToast(''), 3000)
  }

  function getFiltered() {
    return players.filter(p =>
      (activePos === 'all' || p.position === activePos) &&
      (!clubFilter || p.club === clubFilter) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.club || '').toLowerCase().includes(search.toLowerCase()))
    )
  }

  function getClubs() {
    return Array.from(new Set(players.map(p => p.club).filter(Boolean))).sort()
  }

  function openAdd() {
    setEditingPlayer(null)
    setForm({})
    setActiveTab('info')
    setShowPlayerModal(true)
  }

  function openEdit(p: Player) {
    setEditingPlayer(p)
    const f: any = {
      name: p.name, club: p.club, position: p.position || 'GK',
      nationality: p.nationality, dob: p.dob, notes: p.notes,
      contractType: p.contract_type, structure: p.structure,
      activeDate: p.active_date, guaranteeEnd: p.guarantee_end,
      opt1End: p.opt1_end, opt2End: p.opt2_end, contractNotes: p.contract_notes,
    }
    const sal = p.salaries || {}
    const mon = p.monthlies || {}
    ;['2026', '2027s', '2027r', '2028', '2029', '2030'].forEach(k => {
      f[`sal_${k}`] = sal[k] ? '$' + Number(sal[k]).toLocaleString('en-US') : ''
      f[`mon_${k}`] = mon[k] ? '$' + Number(mon[k]).toLocaleString('en-US') : ''
    })
    setForm(f)
    setActiveTab('info')
    setShowPlayerModal(true)
  }

  async function savePlayer() {
    if (!form.name?.trim()) return showToast('Player name required', true)
    const salaries: Salaries = {}
    const monthlies: Salaries = {}
    ;['2026', '2027s', '2027r', '2028', '2029', '2030'].forEach(k => {
      const a = parseSal(form[`sal_${k}`] || '')
      const m = parseSal(form[`mon_${k}`] || '')
      if (a) salaries[k] = a
      if (m) monthlies[k] = m
    })
    const payload = {
      name: form.name.trim(), club: form.club?.trim() || '',
      position: form.position || 'GK', nationality: form.nationality?.trim() || '',
      dob: form.dob || '', notes: form.notes?.trim() || '',
      contract_type: form.contractType || 'Guaranteed',
      structure: form.structure?.trim() || '',
      active_date: form.activeDate || '', guarantee_end: form.guaranteeEnd || '',
      opt1_end: form.opt1End || '', opt2_end: form.opt2End || '',
      contract_notes: form.contractNotes?.trim() || '',
      salaries, monthlies,
    }
    if (editingPlayer) {
      const { error } = await supabase.from('players').update(payload).eq('id', editingPlayer.id)
      if (error) return showToast(error.message, true)
      showToast('Player updated')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('players').insert({ ...payload, user_id: user!.id })
      if (error) return showToast(error.message, true)
      showToast('Player added')
    }
    setShowPlayerModal(false)
    loadPlayers()
  }

  async function deletePlayer() {
    if (!editingPlayer) return
    if (!confirm('Remove this player?')) return
    const { error } = await supabase.from('players').delete().eq('id', editingPlayer.id)
    if (error) return showToast(error.message, true)
    showToast('Player removed')
    setShowPlayerModal(false)
    loadPlayers()
  }

  async function handlePDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseStatus('Reading PDF…')
    setParseProgress(20)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      setParseStatus('Extracting contract data…')
      setParseProgress(55)
      try {
        const resp = await fetch('/api/extract-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mediaType: 'application/pdf' })
        })
        const parsed = await resp.json()
        if (parsed.error) throw new Error(parsed.error)
        setParseProgress(90)
        const existing = players.find(p => p.name.toLowerCase().trim() === parsed.name.toLowerCase().trim())
        const salaries = parsed.salaries || {}
        const monthlies = parsed.monthlies || {}
        if (existing) {
          const { error } = await supabase.from('players').update({
            club: parsed.club || existing.club,
            position: parsed.position || existing.position,
            contract_type: parsed.contractType || existing.contract_type,
            structure: parsed.structure || existing.structure,
            active_date: parsed.activeDate || existing.active_date,
            guarantee_end: parsed.guaranteeEnd || existing.guarantee_end,
            salaries, monthlies,
          }).eq('id', existing.id)
          if (error) throw new Error(error.message)
          setParseStatus(`Updated: ${parsed.name} ✓`)
          showToast(`Updated: ${parsed.name}`)
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          const { error } = await supabase.from('players').insert({
            user_id: user!.id,
            name: parsed.name, club: parsed.club || '',
            position: parsed.position || 'GK',
            contract_type: parsed.contractType || 'Guaranteed',
            structure: parsed.structure || '',
            active_date: parsed.activeDate || '',
            guarantee_end: parsed.guaranteeEnd || '',
            salaries, monthlies,
            nationality: '', dob: '', notes: '',
            opt1_end: '', opt2_end: '', contract_notes: '',
          })
          if (error) throw new Error(error.message)
          setParseStatus(`Added: ${parsed.name} ✓`)
          showToast(`Added: ${parsed.name}`)
        }
        setParseProgress(100)
        loadPlayers()
        setTimeout(() => {
          setParseStatus('')
          setParseProgress(0)
          e.target.value = ''
        }, 2500)
      } catch (err: any) {
        setParseStatus('Error: ' + err.message)
        setParseProgress(0)
        showToast('Extraction failed', true)
      }
    }
    reader.readAsDataURL(file)
  }function renderStats() {
    const f = getFiltered()
    const total = f.reduce((s, p) => s + getSal(p, period), 0)
    const avg = f.length ? Math.round(total / f.length) : 0
    const max = f.length ? Math.max(...f.map(p => getSal(p, period))) : 0
    const isSprint = period === '2027s' || period === '2027r'
    const color = isSprint ? S.sprint : S.green
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Players tracked', val: String(f.length) },
          { label: `Total · ${periodLabel(period)}`, val: fmt(total) },
          { label: 'Average salary', val: fmt(avg) },
          { label: 'Highest salary', val: fmt(max) },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', padding: '1rem 1.1rem', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: S.muted, marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: '26px', color }}>{s.val}</div>
          </div>
        ))}
      </div>
    )
  }

  function renderRoster() {
    const f = getFiltered().sort((a, b) => getSal(b, period) - getSal(a, period))
    const isSplit = period === '2027s' || period === '2027r'
    return (
      <div>
        {renderStats()}
        <div style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: S.green }}>{f.length} player{f.length !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: '11px', color: S.muted }}>Sorted highest to lowest</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '12.5px' }}>
              <thead>
                <tr>
                  {['Player', 'Club', 'Pos', 'Contract', periodLabel(period), 'Years', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', textAlign: 'left' as const, fontSize: '9px', fontWeight: 600, color: isSplit && i === 4 ? S.sprint : S.muted, letterSpacing: '1.5px', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}`, background: isSplit && i === 4 ? '#f9f0eb' : S.cream }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {f.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center' as const, padding: '2.5rem', color: S.muted }}>No players yet — upload a PDF or add manually</td></tr>
                ) : f.map(p => {
                  const s = getSal(p, period)
                  const hasSplit = p.salaries?.['2027r'] && p.salaries['2027r'] !== p.salaries['2027s']
                  const allKeys = Object.keys(p.salaries || {}).filter(k => (p.salaries || {})[k] > 0)
                  const dispKeys = Array.from(new Set(allKeys.map(k => k === '2027r' ? '2027s' : k)))
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: 500 }}>
                        {p.name}
                        {hasSplit && <span style={{ marginLeft: '6px', background: '#f5e8e0', color: S.sprint, border: `1px solid #e8c4aa`, borderRadius: '2px', fontSize: '9px', padding: '1px 5px', fontWeight: 600 }}>Split 27</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted }}>{p.club || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)` }}>{getPosBadge(p.position)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted, fontSize: '11px' }}>{p.contract_type || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: 600, color: isSplit ? S.sprint : S.green, background: isSplit ? '#fdf7f4' : '' }}>{fmt(s)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)` }}>
                        {dispKeys.map(k => (
                          <span key={k} style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: '2px', fontSize: '10px', fontWeight: 600, background: k === '2026' ? S.green : S.creamDark, color: k === '2026' ? 'white' : S.muted, border: `1px solid ${S.border}`, marginRight: '2px' }}>{k === '2027s' ? '2027' : periodLabel(k)}</span>
                        ))}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)` }}>
                        <button onClick={() => openEdit(p)} style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: '3px', background: 'transparent', color: S.muted, cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>Edit</button>
                        <button onClick={async () => { if (confirm('Remove this player?')) { await supabase.from('players').delete().eq('id', p.id); loadPlayers(); showToast('Player removed') } }} style={{ padding: '4px 8px', border: `1px solid ${S.border}`, borderRadius: '3px', background: 'transparent', color: S.muted, cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  function renderCompare() {
    if (!compPlayer) return (
      <div style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', padding: '3rem', textAlign: 'center' as const, color: S.muted }}>
        Select a player above to begin comp analysis
      </div>
    )
    const myPlayer = players.find(p => p.id === compPlayer)
    if (!myPlayer) return null
    const pos = myPlayer.position
    const mySal = getSal(myPlayer, compYear)
    const clubGroups: Record<string, Player[]> = {}
    players.filter(p => p.position === pos && getSal(p, compYear) > 0).forEach(p => {
      const c = p.club || ('__nc_' + p.id)
      if (!clubGroups[c]) clubGroups[c] = []
      clubGroups[c].push(p)
    })
    const rows: { player: Player; club: string; salary: number; isMe: boolean }[] = []
    Object.entries(clubGroups).forEach(([club, grp]) => {
      grp.sort((a, b) => getSal(b, compYear) - getSal(a, compYear))
      const idx = parseInt(compDepth) - 1
      if (grp[idx]) rows.push({ player: grp[idx], club: club.startsWith('__nc') ? 'No club' : club, salary: getSal(grp[idx], compYear), isMe: grp[idx].id === compPlayer })
    })
    if (!rows.find(r => r.isMe) && mySal > 0) rows.push({ player: myPlayer, club: myPlayer.club || 'No club', salary: mySal, isMe: true })
    rows.sort((a, b) => b.salary - a.salary)
    const myRank = rows.findIndex(r => r.isMe) + 1
    const sals = rows.map(r => r.salary).filter(Boolean)
    const avg = sals.length ? Math.round(sals.reduce((s, v) => s + v, 0) / sals.length) : 0
    const depthLabel = ['Starter', '2nd string', '3rd string', '4th string'][parseInt(compDepth) - 1]
    const posLabel: Record<string, string> = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' }
    const pctNum = mySal && avg ? ((mySal - avg) / avg * 100) : null
    const pct = pctNum !== null ? pctNum.toFixed(1) + '%' : '—'
    const isSplit = compYear === '2027s' || compYear === '2027r'
    const accent = isSplit ? S.sprint : S.green
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '1rem' }}>
          {[
            { label: 'League rank', val: `#${myRank} of ${rows.length}`, color: myRank <= 3 ? S.gold : accent },
            { label: `Salary · ${periodLabel(compYear)}`, val: fmt(mySal), color: accent },
            { label: 'League avg', val: fmt(avg), color: accent },
            { label: 'vs avg', val: pct, color: pctNum === null ? S.muted : pctNum >= 0 ? S.green : '#c0392b' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', padding: '1rem 1.1rem', borderTop: `3px solid ${accent}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: S.muted, marginBottom: '6px', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: '26px', color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '0.625rem 1rem', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, fontWeight: 600, color: 'white', background: S.green }}>
            {posLabel[pos]} {depthLabel}s — {periodLabel(compYear)} · {rows.length} clubs
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '12.5px' }}>
            <thead>
              <tr>
                {['Rank', 'Player', 'Club', 'Salary', 'Relative'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left' as const, fontSize: '9px', fontWeight: 600, color: S.muted, letterSpacing: '1.5px', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}`, background: S.cream }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rk = i + 1
                const bar = rows[0].salary ? Math.round(r.salary / rows[0].salary * 100) : 0
                return (
                  <tr key={r.player.id} style={{ background: r.isMe ? 'rgba(184,150,46,0.08)' : '' }}>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, borderLeft: r.isMe ? `3px solid ${S.gold}` : '' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', fontWeight: 600, background: rk === 1 ? S.green : 'transparent', color: rk === 1 ? 'white' : S.muted, border: rk === 1 ? 'none' : `1px solid ${S.border}` }}>{rk}</span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: r.isMe ? 600 : 400 }}>
                      {r.player.name}
                      {r.isMe && <span style={{ marginLeft: '6px', fontSize: '10px', background: S.gold, color: 'white', padding: '1px 5px', borderRadius: '2px', fontWeight: 600 }}>CLIENT</span>}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted }}>{r.club}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: 600, color: accent }}>{fmt(r.salary)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, width: '140px' }}>
                      <div style={{ height: '6px', background: S.creamDark, borderRadius: '2px' }}>
                        <div style={{ height: '6px', background: r.isMe ? S.gold : S.greenLight, width: `${bar}%`, borderRadius: '2px' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderTimeline() {
    const f = getFiltered().sort((a, b) => getSal(b, '2026') - getSal(a, '2026'))
    return (
      <div style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: S.green }}>Salary timeline 2026–2030</span>
          <span style={{ fontSize: '11px', color: S.muted }}>Option years in italics · 2027 split by season</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '12.5px' }}>
            <thead>
              <tr>
                {['Player', 'Club', 'Pos', '2026', '2027 Sprint Jan-Jun', '2027 Regular Jul-Dec', '2028', '2029 opt', '2030 opt'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: 'left' as const, fontSize: '9px', fontWeight: 600, color: i === 4 ? S.sprint : S.muted, letterSpacing: '1.5px', textTransform: 'uppercase' as const, borderBottom: `1px solid ${S.border}`, background: i === 4 ? '#f9f0eb' : S.cream }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.map(p => {
                const s26 = getSal(p, '2026')
                const s27s = getSal(p, '2027s')
                const s27r = p.salaries?.['2027r'] || 0
                const hasDiff = s27r && s27r !== s27s
                const s28 = getSal(p, '2028')
                const s29 = getSal(p, '2029')
                const s30 = getSal(p, '2030')
                return (
                  <tr key={p.id}>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted }}>{p.club || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)` }}>{getPosBadge(p.position)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: s26 ? 600 : 400, color: s26 ? S.green : S.muted }}>{fmt(s26)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: s27s ? 600 : 400, color: s27s ? S.sprint : S.muted, background: '#fdf7f4' }}>{fmt(s27s)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: hasDiff ? 600 : 400, color: hasDiff ? S.greenMid : S.muted, fontStyle: hasDiff ? 'normal' : 'italic' }}>{hasDiff ? fmt(s27r) : s27s ? 'same as Sprint' : '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, fontWeight: s28 ? 600 : 400, color: s28 ? S.green : S.muted }}>{fmt(s28)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted, fontStyle: 'italic' }}>{fmt(s29)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(200,212,204,0.4)`, color: S.muted, fontStyle: 'italic' }}>{fmt(s30)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }function renderPlayerModal() {
    const inp = (id: string, label: string, type = 'text', placeholder = '') => (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px', marginBottom: '12px' }}>
        <label style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted }}>{label}</label>
        <input type={type} placeholder={placeholder} value={form[id] || ''} onChange={e => setForm((f: any) => ({ ...f, [id]: e.target.value }))}
          style={{ padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '13px', color: S.text }} />
      </div>
    )
    const salRow = (k: string, label: string, sublabel = '', isSprint = false) => (
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '8px', alignItems: 'center', marginBottom: '7px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: isSprint ? S.sprint : S.muted }}>{label}</div>
          {sublabel && <div style={{ fontSize: '10px', color: S.muted, fontStyle: 'italic' }}>{sublabel}</div>}
        </div>
        <input placeholder="Annual $" value={form[`sal_${k}`] || ''} onChange={e => setForm((f: any) => ({ ...f, [`sal_${k}`]: fmtInput(e.target.value) }))}
          style={{ padding: '7px 8px', border: `1px solid ${isSprint ? '#e8c4aa' : S.border}`, borderRadius: '3px', background: isSprint ? '#fdf7f4' : S.cream, fontSize: '12px', color: S.text }} />
        <input placeholder="Monthly $" value={form[`mon_${k}`] || ''} onChange={e => setForm((f: any) => ({ ...f, [`mon_${k}`]: fmtInput(e.target.value) }))}
          style={{ padding: '7px 8px', border: `1px solid ${isSprint ? '#e8c4aa' : S.border}`, borderRadius: '3px', background: isSprint ? '#fdf7f4' : S.cream, fontSize: '12px', color: S.text }} />
      </div>
    )
    const sel = (id: string, label: string, options: string[]) => (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px', marginBottom: '12px' }}>
        <label style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted }}>{label}</label>
        <select value={form[id] || options[0]} onChange={e => setForm((f: any) => ({ ...f, [id]: e.target.value }))}
          style={{ padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '13px', color: S.text }}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    )
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,15,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: 'white', borderRadius: '4px', border: `1px solid ${S.border}`, width: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: '20px', color: S.green, marginBottom: '1.25rem', fontWeight: 500 }}>{editingPlayer ? 'Edit Player' : 'Add Player'}</div>
          <div style={{ display: 'flex', marginBottom: '1.25rem', border: `1px solid ${S.border}`, borderRadius: '3px', overflow: 'hidden' }}>
            {['info', 'salary', 'contract'].map((t, i) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: '8px', border: 'none', borderRight: i < 2 ? `1px solid ${S.border}` : 'none', background: activeTab === t ? S.green : S.cream, fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: activeTab === t ? 'white' : S.muted, cursor: 'pointer' }}>
                {['Player info', 'Salary', 'Contract'][i]}
              </button>
            ))}
          </div>
          {activeTab === 'info' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>{inp('name', 'Full name *', 'text', 'e.g. Elías Báez')}</div>
                <div>{inp('club', 'Club', 'text', 'e.g. CF Montréal')}</div>
                <div>{sel('position', 'Position', ['GK', 'DEF', 'MID', 'FWD'])}</div>
                <div>{inp('nationality', 'Nationality', 'text', 'e.g. Colombian')}</div>
                <div>{inp('dob', 'Date of birth', 'date')}</div>
                <div>{inp('notes', 'Notes', 'text', 'e.g. our client...')}</div>
              </div>
            </div>
          )}
          {activeTab === 'salary' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                <span /><span style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted, textAlign: 'center' as const }}>Annual</span>
                <span style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted, textAlign: 'center' as const }}>Monthly</span>
              </div>
              {salRow('2026', '2026')}
              <div style={{ background: '#fdf7f4', border: '1px solid #e8c4aa', borderRadius: '4px', padding: '12px', margin: '8px 0' }}>
                <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.sprint, marginBottom: '10px' }}>2027 — Split Season</div>
                {salRow('2027s', 'Sprint', 'Jan 1 – Jun 30', true)}
                {salRow('2027r', 'Regular', 'Jul 1 – Dec 31')}
                <div style={{ fontSize: '10px', color: S.muted, fontStyle: 'italic', marginTop: '6px' }}>If salary is the same all year, only fill in Sprint and leave Regular blank.</div>
              </div>
              {salRow('2028', '2028')}
              <div style={{ borderTop: `1px solid ${S.border}`, margin: '8px 0 6px', paddingTop: '6px', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted }}>Option years</div>
              {salRow('2029', '2029')}
              {salRow('2030', '2030')}
            </div>
          )}
          {activeTab === 'contract' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>{sel('contractType', 'Contract type', ['Guaranteed', 'Option', 'Loan', 'Trial'])}</div>
                <div>{inp('structure', 'Structure', 'text', 'e.g. 2.9+1.0+1.0')}</div>
                <div>{inp('activeDate', 'Active date', 'date')}</div>
                <div>{inp('guaranteeEnd', 'Guarantee end', 'date')}</div>
                <div>{inp('opt1End', 'Option 1 end', 'date')}</div>
                <div>{inp('opt2End', 'Option 2 end', 'date')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
                <label style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted }}>Additional notes</label>
                <textarea rows={3} value={form.contractNotes || ''} onChange={e => setForm((f: any) => ({ ...f, contractNotes: e.target.value }))} placeholder="Any additional contract terms or notes..."
                  style={{ padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '13px', color: S.text }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${S.border}` }}>
            {editingPlayer && <button onClick={deletePlayer} style={{ padding: '8px 18px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer', background: '#fef2f2', color: '#c0392b', border: '1px solid #fcc' }}>Delete</button>}
            <button onClick={() => setShowPlayerModal(false)} style={{ padding: '8px 18px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer', background: 'transparent', border: `1px solid ${S.border}`, color: S.text }}>Cancel</button>
            <button onClick={savePlayer} style={{ padding: '8px 18px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer', background: S.green, color: 'white', border: 'none' }}>Save player</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: S.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet" />

      {/* SIDEBAR */}
      <div style={{ width: '220px', minWidth: '220px', background: S.green, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', letterSpacing: '2px', textTransform: 'uppercase' as const }}>ContractIQ</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginTop: '1px' }}>Agency Platform</div>
        </div>
        <div style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', padding: '0.75rem 0.5rem 0.4rem', fontWeight: 600 }}>Views</div>
          {[['roster', 'All players'], ['compare', 'Comp analysis'], ['timeline', 'Timeline']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '8px 10px', border: 'none', background: view === v ? 'rgba(255,255,255,0.12)' : 'transparent', color: view === v ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer', textAlign: 'left' as const }}>{label}</button>
          ))}
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', padding: '0.75rem 0.5rem 0.4rem', fontWeight: 600, marginTop: '0.5rem' }}>Position</div>
          {[['all', 'All positions'], ['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['FWD', 'Forwards']].map(([p, label]) => (
            <button key={p} onClick={() => setActivePos(p)} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '8px 10px', border: 'none', background: activePos === p ? 'rgba(255,255,255,0.12)' : 'transparent', color: activePos === p ? 'white' : 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 500, borderRadius: '4px', cursor: 'pointer', textAlign: 'left' as const }}>{label}</button>
          ))}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          <button onClick={() => setShowUploadModal(true)} style={{ width: '100%', padding: '9px 12px', background: S.gold, color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>Upload PDF</button>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '9px 12px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }}>
        <div style={{ padding: '0 1.5rem', height: '54px', background: 'white', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '18px', color: S.green, flex: 1, fontWeight: 400 }}>
            {view === 'roster' && 'All Players'}
            {view === 'compare' && 'Comp Analysis'}
            {view === 'timeline' && 'Salary Timeline'}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players, clubs..." style={{ padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '12px', color: S.text, width: '190px' }} />
          <select value={clubFilter} onChange={e => setClubFilter(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '12px', color: S.text }}>
            <option value="">All clubs</option>
            {getClubs().map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: '3px', background: S.cream, fontSize: '12px', color: S.text }}>
            <option value="2026">2026</option>
            <option value="2027s">2027 Sprint (Jan–Jun)</option>
            <option value="2027r">2027 Regular (Jul–Dec)</option>
            <option value="2028">2028</option>
            <option value="2029">2029 (opt)</option>
            <option value="2030">2030 (opt)</option>
          </select>
          <button onClick={() => window.print()} style={{ padding: '7px 14px', border: `1px solid ${S.border}`, borderRadius: '3px', background: 'transparent', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: S.green, cursor: 'pointer' }}>Print</button>
          <button onClick={openAdd} style={{ padding: '7px 14px', border: 'none', borderRadius: '3px', background: S.green, fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: 'white', cursor: 'pointer' }}>+ Add player</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center' as const, padding: '3rem', color: S.muted }}>Loading...</div>
          ) : (
            <>
              {view === 'roster' && renderRoster()}
              {view === 'compare' && (
                <div>
                  <div style={{ background: 'white', border: `1px solid ${S.border}`, borderRadius: '4px', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '20px', color: S.green, marginBottom: '0.25rem', fontWeight: 500 }}>Comp Analysis</div>
                    <p style={{ fontSize: '12px', color: S.muted, marginBottom: '1rem' }}>Select your player and depth tier to compare against the same tier leaguewide</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                      {[
                        { label: 'Your player', el: <select value={compPlayer} onChange={e => setCompPlayer(e.target.value)} style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: '3px', fontSize: '12px', background: S.cream, color: S.text }}><option value="">— select player —</option>{players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position}{p.club ? ' · ' + p.club : ''})</option>)}</select> },
                        { label: 'Depth tier', el: <select value={compDepth} onChange={e => setCompDepth(e.target.value)} style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: '3px', fontSize: '12px', background: S.cream, color: S.text }}><option value="1">Starter</option><option value="2">2nd string</option><option value="3">3rd string</option><option value="4">4th string</option></select> },
                        { label: 'Period', el: <select value={compYear} onChange={e => setCompYear(e.target.value)} style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: '3px', fontSize: '12px', background: S.cream, color: S.text }}><option value="2026">2026</option><option value="2027s">2027 Sprint</option><option value="2027r">2027 Regular</option><option value="2028">2028</option><option value="2029">2029 opt</option><option value="2030">2030 opt</option></select> },
                      ].map((c, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                          <label style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: 600, color: S.muted }}>{c.label}</label>
                          {c.el}
                        </div>
                      ))}
                    </div>
                  </div>
                  {renderCompare()}
                </div>
              )}
              {view === 'timeline' && renderTimeline()}
            </>
          )}
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,15,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '4px', border: `1px solid ${S.border}`, width: '460px', padding: '1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '20px', color: S.green, marginBottom: '1.25rem', fontWeight: 500 }}>Upload Contract PDF</div>
            <label style={{ display: 'block', border: '2px dashed #c8d4cc', borderRadius: '4px', padding: '2rem', textAlign: 'center' as const, cursor: 'pointer', color: S.muted }}>
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Click to select an MLSPA deal summary PDF</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>Saved automatically · split 2027 salaries detected if present</div>
              <input type="file" accept=".pdf" onChange={handlePDF} style={{ display: 'none' }} />
            </label>
            {parseProgress > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ height: '2px', background: S.border, borderRadius: '1px' }}>
                  <div style={{ height: '2px', background: S.green, width: `${parseProgress}%`, borderRadius: '1px', transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: '11px', color: S.muted, marginTop: '6px' }}>{parseStatus}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => { setShowUploadModal(false); setParseStatus(''); setParseProgress(0) }} style={{ padding: '8px 18px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, cursor: 'pointer', background: 'transparent', border: `1px solid ${S.border}`, color: S.text }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showPlayerModal && renderPlayerModal()}

      {toast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: toastError ? '#c0392b' : S.green, color: 'white', padding: '10px 18px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', zIndex: 200 }}>{toast}</div>
      )}
    </div>
  )
}
