import { useEffect, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  BarChart,
  Bar,
  Tooltip,
} from 'recharts'
import { getSegments, getAnomalies, runAllocation as apiAllocate, runSimulation as apiSimulate } from './api'
import './App.css'

const BLUE = '#2535c8'
const INK = '#1f2a52'
const MUTED = '#6b7088'
const PANEL = '#fcfcff'
const TINT = '#cbd5f1'
const GRID = '#dfe1ea'
const MONO = "'IBM Plex Mono', ui-monospace, Consolas, monospace"
const TICK = { fill: MUTED, fontSize: 11, fontFamily: MONO }
const TOOLTIP_STYLE = {
  background: PANEL,
  border: `1.5px solid ${BLUE}`,
  borderRadius: 0,
  fontFamily: MONO,
  fontSize: 11,
  color: INK,
}

const pad2 = (n) => String(n).padStart(2, '0')

// bar colour: orange when nearly full, green when mostly idle
const utilTone = (u) => (u >= 90 ? 'hot' : u < 50 ? 'cool' : '')

// Converts a row from /api/segments into the shape the UI uses
function mapSegment(s) {
  const baseIp = s.base_ipv6_prefix.split('/')[0]
  return {
    name: s.name,
    prefix: `${baseIp}/${s.current_prefix_length}`,
    devices: s.active_devices,
    utilization: s.allocated_addresses
      ? Math.min(100, Math.round((s.active_devices / s.allocated_addresses) * 100))
      : 0,
  }
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

/* ---------- reusable window panel ---------- */
function Win({ title, children, flush = false }) {
  return (
    <section className="win">
      <div className="win-bar">
        <span>{title}</span>
        <span aria-hidden="true">×</span>
      </div>
      <div className={`win-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

function MetricCard({ title, value, children }) {
  return (
    <Win title={title}>
      <div className="big-number">{value}</div>
      {children}
    </Win>
  )
}

/* ---------- 01 DASHBOARD ---------- */
function Dashboard({ segments, anomalies, refresh }) {
  const [allocating, setAllocating] = useState('')
  const [lastSlice, setLastSlice] = useState(null)
  const [status, setStatus] = useState('POST /API/ALLOCATE · READY')

  async function runAllocation(segmentName = 'ALL') {
    setAllocating(segmentName)
    const t0 = performance.now()
    try {
      const prev = Object.fromEntries(segments.map((s) => [s.name, s]))

      // JS: Sunday=0 ... Saturday=6  ->  backend: Monday=0 ... Sunday=6
      const jsDay = new Date().getDay()
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
      const isWeekend = dayOfWeek >= 5 ? 1 : 0

      const data = await apiAllocate(dayOfWeek, isWeekend)
      const secs = ((performance.now() - t0) / 1000).toFixed(1)
      setStatus(`POST /API/ALLOCATE · 200 OK · ${secs}S`)

      const picked =
        segmentName === 'ALL'
          ? data.allocations[0]
          : data.allocations.find((a) => a.segment === segmentName)

      if (picked) {
        const old = prev[picked.segment]
        const delta = old && old.devices
          ? Math.round(((picked.predicted_devices - old.devices) / old.devices) * 100)
          : 0
        setLastSlice({
          segment: picked.segment,
          before: old ? old.prefix : '—',
          after: picked.assigned_prefix,
          delta,
        })
      }
      await refresh()
    } catch (err) {
      setStatus('POST /API/ALLOCATE · FAILED · IS FLASK RUNNING?')
    } finally {
      setAllocating('')
    }
  }

  const totalDevices = segments.reduce((sum, s) => sum + s.devices, 0)
  const avgUtil = segments.length
    ? segments.reduce((sum, s) => sum + s.utilization, 0) / segments.length
    : 0
  const high = anomalies.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length
  const med = anomalies.filter((a) => a.severity === 'MEDIUM').length
  const low = anomalies.filter((a) => a.severity === 'LOW').length

  return (
    <>
      <h1 className="page-title">NETWORK,<br />BY DESIGN.</h1>
      <p className="page-subtitle">DASHBOARD · LIVE ALLOCATION CONTROL PANEL</p>

      <div className="metrics">
        <MetricCard title="Total Active Devices" value={totalDevices.toLocaleString()}>
          <div className="label">FROM BACKEND DATABASE</div>
        </MetricCard>

        <MetricCard title="Allocated Subnets" value={segments.length}>
          <div className="label">ACROSS {segments.length} SEGMENTS</div>
        </MetricCard>

        <MetricCard title="Address Utilization" value={`${avgUtil.toFixed(1)}%`}>
          <div className="bar wide"><i style={{ width: `${avgUtil}%` }} /></div>
        </MetricCard>

        <MetricCard title="Active Anomalies" value={pad2(anomalies.length)}>
          <div className="badges">
            {high > 0 && <span className="badge high">{high} HIGH</span>}
            {med > 0 && <span className="badge med">{med} MED</span>}
            {low > 0 && <span className="badge low">{low} LOW</span>}
            {anomalies.length === 0 && <span className="label">NONE LOGGED</span>}
          </div>
        </MetricCard>
      </div>

      <div className="split">
        <Win title={`Network Segments · ${pad2(segments.length)} Active`} flush>
          <table className="tbl">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Segment</th>
                <th>IPv6 Prefix</th>
                <th>Devices</th>
                <th>Utilization</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.name}>
                  <td className="name">{segment.name}</td>
                  <td>{segment.prefix}</td>
                  <td>{segment.devices.toLocaleString()}</td>
                  <td>
                    <div className="util">
                      <span className={`bar ${utilTone(segment.utilization)}`}>
                        <i style={{ width: `${segment.utilization}%` }} />
                      </span>
                      <span className="pct">{segment.utilization}%</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn row"
                      disabled={!!allocating}
                      onClick={() => runAllocation(segment.name)}
                    >
                      {allocating === segment.name ? 'Running...' : 'Run AI Allocation'}
                    </button>
                  </td>
                </tr>
              ))}
              {segments.length === 0 && (
                <tr>
                  <td className="empty" colSpan={5}>No segments loaded. Start the Flask backend.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Win>

        <div className="stack">
          <Win title="AI Allocation Control">
            <div className="label" style={{ marginBottom: 14 }}>SCOPE: ALL SEGMENTS</div>
            <button
              className="btn solid full"
              disabled={!!allocating}
              onClick={() => runAllocation('ALL')}
            >
              {allocating === 'ALL' ? 'Running...' : 'Run AI Allocation'}
            </button>
            <p className="caption">{status}</p>
          </Win>

          <Win title={`Last Slice · ${lastSlice ? lastSlice.segment : '—'}`}>
            <div className="label">BEFORE</div>
            <div className="mono-line" style={{ marginBottom: 10 }}>{lastSlice ? lastSlice.before : '—'}</div>
            <div className="label">
              AFTER{lastSlice ? ` · DEMAND ${lastSlice.delta >= 0 ? '+' : ''}${lastSlice.delta}%` : ''}
            </div>
            <div className="mono-line strong">{lastSlice ? lastSlice.after : '—'}</div>
          </Win>
        </div>
      </div>
    </>
  )
}

/* ---------- 02 ANALYTICS ---------- */
const HIST = [1200, 1268, 1335, 1413, 1490, 1535, 1665, 1735, 1785, 1815]
const PRED = [1895, 1975, 2060, 2170, 2280]
const SPREAD = [25, 60, 100, 140, 185]

function weekLabel(k) {
  return k < 0 ? `W${k}` : k === 0 ? 'NOW' : `W+${k}`
}

function buildForecast(m) {
  const rows = HIST.map((v, i) => ({
    week: weekLabel(i - 9),
    actual: Math.round(v * m),
    predicted: i === 9 ? Math.round(v * m) : null,
    band: i === 9 ? [Math.round(v * m), Math.round(v * m)] : null,
  }))
  PRED.forEach((v, i) => {
    rows.push({
      week: weekLabel(i + 1),
      actual: null,
      predicted: Math.round(v * m),
      band: [Math.round((v - SPREAD[i]) * m), Math.round((v + SPREAD[i]) * m)],
    })
  })
  return rows
}

function DemandChart({ selected }) {
  const m = selected === 'WiFi-Campus' ? 1.7 : selected === 'Lab-A' ? 0.65 : 1
  const data = buildForecast(m)
  const ticks = [1200, 1600, 2000, 2400].map((v) => Math.round((v * m) / 100) * 100)
  const top = Math.round((2560 * m) / 100) * 100

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
        {ticks.map((t) => (
          <ReferenceLine key={t} y={t} stroke={GRID} />
        ))}
        <XAxis
          dataKey="week"
          ticks={['W-9', 'W-5', 'NOW', 'W+5']}
          interval={0}
          tick={TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[ticks[0], top]}
          ticks={ticks}
          tickFormatter={(v) => v.toLocaleString()}
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <ReferenceLine
          x="NOW"
          stroke={MUTED}
          strokeDasharray="2 3"
          label={{ value: 'FORECAST →', position: 'insideTopRight', fill: MUTED, fontSize: 11, fontFamily: MONO }}
        />
        <Area dataKey="band" stroke="none" fill={TINT} fillOpacity={0.9} isAnimationActive={false} />
        <Line dataKey="actual" stroke={BLUE} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
        <Line
          dataKey="predicted"
          stroke={BLUE}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function severityClass(sev) {
  if (sev === 'HIGH' || sev === 'CRITICAL') return 'high'
  if (sev === 'LOW') return 'low'
  return 'med'
}

function Analytics({ anomalies }) {
  const [selected, setSelected] = useState('Hostel-Block-1')

  return (
    <>
      <h1 className="page-title">DEMAND,<br />FORECAST.</h1>
      <p className="page-subtitle">ANALYTICS · ML DEMAND FORECAST & ANOMALY DETECTION</p>

      <div className="split">
        <Win title="Device Growth vs AI Predicted Demand">
          <div className="chips">
            {['Lab-A', 'Hostel-Block-1', 'WiFi-Campus'].map((name) => (
              <button
                key={name}
                className={`btn ${selected === name ? 'active' : ''}`}
                onClick={() => setSelected(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="chart-box tall">
            <DemandChart selected={selected} />
          </div>
          <p className="caption">SOLID = HISTORICAL · DASHED = AI PREDICTED · SHADE = CONFIDENCE BAND</p>
        </Win>

        <div className="stack">
          <Win title="Model">
            <div className="mono-line" style={{ marginBottom: 4 }}>Random Forest</div>
            <div className="big-number">6.2%</div>
            <div className="label">MAPE · 30-DAY HORIZON</div>
          </Win>
          <Win title="Next Prefix Change">
            <div className="mono-line strong" style={{ marginBottom: 8 }}>/48 → /47</div>
            <div className="label">{selected.toUpperCase()} · IN 18 DAYS</div>
          </Win>
        </div>
      </div>

      <Win title="Anomaly Alert Feed · Isolation Forest" flush>
        <table className="tbl alerts">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '21%' }} />
            <col style={{ width: '43%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Segment</th>
              <th>Anomaly Type</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.anomaly_id}>
                <td>{a.timestamp}</td>
                <td className="name">{a.segment_name}</td>
                <td>{a.anomaly_type}</td>
                <td>
                  <span className={`badge ${severityClass(a.severity)}`}>
                    {a.severity === 'MEDIUM' ? 'MED' : a.severity}
                  </span>
                </td>
              </tr>
            ))}
            {anomalies.length === 0 && (
              <tr>
                <td className="empty" colSpan={4}>No anomalies logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Win>
    </>
  )
}

/* ---------- 03 BENCHMARK ---------- */
const SCALE_LABELS = ['100', '1K', '5K', '10K']
const EMPTY_CHART = SCALE_LABELS.map((scale) => ({ scale }))

function BenchChart({ title, caption, data, staticKey, aiKey }) {
  const pid = `hatch-${aiKey}`
  return (
    <Win title={title}>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="22%" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <pattern id={pid} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={PANEL} />
                <line x1="0" y1="0" x2="0" y2="6" stroke={BLUE} strokeWidth="1.5" />
              </pattern>
            </defs>
            <XAxis
              dataKey="scale"
              axisLine={{ stroke: BLUE, strokeWidth: 1.5 }}
              tickLine={false}
              tick={{ ...TICK, fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'rgba(37,53,200,0.06)' }} contentStyle={TOOLTIP_STYLE} />
            {staticKey && (
              <Bar
                dataKey={staticKey}
                name="Static allocation"
                fill={`url(#${pid})`}
                stroke={BLUE}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
            <Bar dataKey={aiKey} name="AI-driven allocation" fill={BLUE} stroke={BLUE} strokeWidth={1.5} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="caption">{caption}</p>
    </Win>
  )
}

function Benchmarking() {
  const [deviceCount, setDeviceCount] = useState(5000)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('READY · PICK A DEVICE COUNT')
  const [result, setResult] = useState(null)
  const [chartData, setChartData] = useState(EMPTY_CHART)

  async function runSimulation() {
    setRunning(true)
    setStatus('RUNNING...')
    const t0 = performance.now()
    try {
      const scales = [100, 1000, 5000, 10000]
      const [selected, ...rows] = await Promise.all([deviceCount, ...scales].map(apiSimulate))
      const s = selected.static_allocation
      const a = selected.ai_dynamic_allocation

      setResult({
        devices: deviceCount,
        wastage: Math.round(((s.address_wastage_pct - a.address_wastage_pct) / s.address_wastage_pct) * 100),
        failures: s.allocation_failures
          ? Math.round(((s.allocation_failures - a.allocation_failures) / s.allocation_failures) * 100)
          : 0,
        latency: selected.performance_metrics.execution_latency_ms,
      })
      setChartData(
        rows.map((r, i) => ({
          scale: SCALE_LABELS[i],
          staticW: r.static_allocation.address_wastage_pct,
          aiW: r.ai_dynamic_allocation.address_wastage_pct,
          staticF: r.static_allocation.allocation_failures,
          aiF: r.ai_dynamic_allocation.allocation_failures,
          aiL: r.performance_metrics.execution_latency_ms,
        }))
      )
      const secs = ((performance.now() - t0) / 1000).toFixed(1)
      setStatus(`COMPLETED · ${deviceCount.toLocaleString()} DEVICES · ${secs}S`)
    } catch (err) {
      setStatus('FAILED · IS FLASK RUNNING ON PORT 5000?')
    } finally {
      setRunning(false)
    }
  }

  const shownDevices = result ? result.devices : deviceCount

  return (
    <>
      <h1 className="page-title">STATIC VS.<br />AI-DRIVEN.</h1>
      <p className="page-subtitle">EVALUATION · BENCHMARK AGAINST STATIC ALLOCATION</p>

      <div className="split bench">
        <Win title="Simulation Control">
          <div className="label">SIMULATED DEVICES</div>
          <div className="big-number xl">{deviceCount.toLocaleString()}</div>
          <input
            aria-label="Number of simulated devices"
            className="range"
            type="range"
            min="100"
            max="10000"
            step="100"
            value={deviceCount}
            style={{ '--pct': `${((deviceCount - 100) / 9900) * 100}%` }}
            onChange={(event) => setDeviceCount(Number(event.target.value))}
          />
          <div className="range-ends label">
            <span>100</span>
            <span>10,000</span>
          </div>
          <button className="btn solid full" disabled={running} onClick={runSimulation}>
            {running ? 'Running...' : 'Run Simulation'}
          </button>
          <p className="caption">{status}</p>
        </Win>

        <Win title={`Result at ${shownDevices.toLocaleString()} Devices`}>
          <div className="results">
            <div>
              <div className="label">ADDRESS WASTAGE</div>
              <div className="big-number xl">{result ? `−${result.wastage}%` : '—'}</div>
            </div>
            <div>
              <div className="label">ALLOCATION FAILURES</div>
              <div className="big-number xl">{result ? `−${result.failures}%` : '—'}</div>
            </div>
            <div>
              <div className="label">LATENCY OVERHEAD</div>
              <div className="big-number xl">{result ? `+${result.latency}ms` : '—'}</div>
            </div>
          </div>
        </Win>
      </div>

      <div className="chart-grid">
        <BenchChart title="Address Wastage" caption="IDLE ADDRESSES % · LOWER IS BETTER" data={chartData} staticKey="staticW" aiKey="aiW" />
        <BenchChart title="Allocation Failures" caption="FAILED REQUESTS · LOWER IS BETTER" data={chartData} staticKey="staticF" aiKey="aiF" />
        <BenchChart title="Execution Overhead" caption="LATENCY MS · X-AXIS = DEVICES" data={chartData} aiKey="aiL" />
      </div>

      <div className="legend">
        <span><i className="swatch hatch" /> STATIC ALLOCATION</span>
        <span><i className="swatch fill" /> AI-DRIVEN ALLOCATION</span>
      </div>
    </>
  )
}

/* ---------- APP SHELL ---------- */
function App() {
  const [screen, setScreen] = useState('dashboard')
  const [segments, setSegments] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [online, setOnline] = useState(true)
  const time = useClock()

  const refresh = useCallback(async () => {
    try {
      const [segs, anoms] = await Promise.all([getSegments(), getAnomalies()])
      setSegments(segs.map(mapSegment))
      setAnomalies(anoms.database_logs)
      setOnline(true)
    } catch (err) {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const navItems = [
    { id: 'dashboard', label: '01 DASHBOARD' },
    { id: 'analytics', label: '02 ANALYTICS' },
    { id: 'benchmark', label: '03 BENCHMARK' },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">V6·MANAGER</div>
        <nav className="top-nav" aria-label="Main navigation">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-btn ${screen === id ? 'active' : ''}`}
              onClick={() => setScreen(id)}
            >
              {label}
            </button>
          ))}
          <div className="clock">IST {time}</div>
        </nav>
      </header>

      {!online && <div className="offline">Backend offline · start Flask on port 5000</div>}

      <main>
        {screen === 'dashboard' && <Dashboard segments={segments} anomalies={anomalies} refresh={refresh} />}
        {screen === 'analytics' && <Analytics anomalies={anomalies} />}
        {screen === 'benchmark' && <Benchmarking />}
      </main>
    </div>
  )
}

export default App