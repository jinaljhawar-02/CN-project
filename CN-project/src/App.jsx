
import { useState } from 'react'
import {
  Network,
  Activity,
  Cpu,
  ShieldAlert,
  LayoutDashboard,
  ChartNoAxesCombined,
  FlaskConical,
  Zap,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import './App.css'

const initialSegments = [
  { name: 'Lab-A', prefix: '2001:db8:1000::/52', devices: 412, utilization: 81 },
  { name: 'Lab-B', prefix: '2001:db8:1100::/52', devices: 268, utilization: 63 },
  { name: 'Hostel-Block-1', prefix: '2001:db8:2000::/48', devices: 1904, utilization: 92 },
  { name: 'Hostel-Block-2', prefix: '2001:db8:2100::/48', devices: 1566, utilization: 77 },
  { name: 'WiFi-Campus', prefix: '2001:db8:3000::/44', devices: 3920, utilization: 88 },
  { name: 'Library', prefix: '2001:db8:4000::/56', devices: 362, utilization: 41 },
]

const alerts = [
  { time: '25 Oct 2026 · 04:12', segment: 'WiFi-Campus', type: 'Sudden 300% usage spike', severity: 'HIGH' },
  { time: '24 Oct 2026 · 21:47', segment: 'Hostel-Block-2', type: 'Duplicate allocation detected', severity: 'HIGH' },
  { time: '24 Oct 2026 · 16:03', segment: 'Lab-A', type: 'Off-hours address surge', severity: 'MED' },
  { time: '23 Oct 2026 · 09:30', segment: 'Library', type: 'Rapid lease churn', severity: 'LOW' },
]

const history = [
  { week: 'W-9', actual: 1120, predicted: null },
  { week: 'W-7', actual: 1270, predicted: null },
  { week: 'W-5', actual: 1450, predicted: null },
  { week: 'W-3', actual: 1610, predicted: null },
  { week: 'W-1', actual: 1790, predicted: null },
  { week: 'NOW', actual: 1930, predicted: 1930 },
  { week: 'W+2', actual: null, predicted: 2070 },
  { week: 'W+5', actual: null, predicted: 2260 },
]

function MetricCard({ label, value, foot, icon: Icon, tone = '' }) {
  return (
    <div className="metric-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span className="metric-label">{label}</span>
        <Icon size={17} color="#38bdf8" />
      </div>
      <div className="metric-value">{value}</div>
      <div className={`metric-foot ${tone}`}>{foot}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div className="section-heading">{children}</div>
}

function Dashboard({ segments, setSegments, setNotice }) {
  const [allocating, setAllocating] = useState('')
  const [lastSlice, setLastSlice] = useState(null)

  

function runAllocation(segmentName = 'ALL') {
  setAllocating(segmentName)
  setNotice('')

  window.setTimeout(() => {
    const selectedSegments =
      segmentName === 'ALL'
        ? segments
        : segments.filter((segment) => segment.name === segmentName)

    if (selectedSegments.length === 0) {
      setNotice('No matching network segment found.')
      setAllocating('')
      return
    }

    const segment = selectedSegments[0]

    setLastSlice({
      segment: segment.name,
      before: segment.prefix,
      after: segment.prefix,
      demo: true,
    })

    setNotice(
      `Demo simulation complete for ${
        segmentName === 'ALL' ? 'all network segments' : segment.name
      }. No real network changes were made.`
    )

    setAllocating('')
  }, 700)
}


  return (
    <>
      <div className="eyebrow">Network intelligence / 01</div>
      <h1 className="page-title">NETWORK,<br />BY DESIGN.</h1>
      <p className="page-subtitle">DASHBOARD · LIVE ALLOCATION CONTROL PANEL</p>

      <div className="metrics-grid">
        <MetricCard label="Total Active Devices" value="8,432" foot="+212 IN LAST 24H" icon={Network} tone="positive" />
        <MetricCard label="Allocated Subnets" value="126" foot="ACROSS 6 SEGMENTS" icon={LayoutDashboard} />
        <MetricCard label="Address Utilization" value="73.4%" foot="NETWORK-WIDE AVERAGE" icon={Activity} />
        <MetricCard label="Active Anomalies" value="03" foot="1 HIGH · 2 MED" icon={ShieldAlert} tone="warning" />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Network Segments · 06 Active</h2>
            <span className="muted small">IPv6 / Live</span>
          </div>

          <table className="network-table">
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
                  <td className="segment-name">{segment.name}</td>
                  <td className="prefix">{segment.prefix}</td>
                  <td>{segment.devices.toLocaleString()}</td>
                  <td>
                    <div className="util-track">
                      <div
                        className={`util-fill ${segment.utilization >= 85 ? 'high' : segment.utilization >= 70 ? 'medium' : ''}`}
                        style={{ width: `${segment.utilization}%` }}
                      />
                    </div>
                    <span className="small">{segment.utilization}%</span>
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      disabled={!!allocating}
                      onClick={() => runAllocation(segment.name)}
                      title={`Run AI allocation for ${segment.name}`}
                    >
                      <Zap size={12} /> {allocating === segment.name ? 'RUNNING' : 'ALLOCATE'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">AI Allocation Control</h2>
            <Zap size={17} color="#38bdf8" />
          </div>
          <p className="muted small">SCOPE: ALL SEGMENTS</p>
          <p className="small" style={{ lineHeight: 1.8 }}>
            Run demand-aware IPv6 prefix allocation across your network segments.
          </p>
          <button
            className="primary-button full-width"
            disabled={!!allocating}
            onClick={() => runAllocation('ALL')}
          >
            <Zap size={15} />
            {allocating === 'ALL' ? 'RUNNING ALLOCATION...' : 'RUN AI ALLOCATION'}
          </button>
          <p className="muted small" style={{ marginTop: 12 }}>
            <Activity size={12} style={{ verticalAlign: 'middle' }} /> DEMO MODE · LOCAL SIMULATION
          </p>

          {lastSlice && (
            <div className="allocation-details">
              <div className="detail-label">Last Slice · {lastSlice.segment || 'Network'}</div>
              <div className="detail-label">Before</div>
              <div className="detail-value">{lastSlice.before || 'Awaiting API result'}</div>
              <div className="detail-arrow"><ArrowRight size={14} /> AFTER ALLOCATION</div>
              <div className="detail-value">{lastSlice.after || 'Awaiting API result'}</div>
              {lastSlice.demo && <p className="muted small">Demo mode · prefix unchanged</p>}
            </div>
          )}

          <div className="allocation-details">
            <div className="detail-label">Allocation Strategy</div>
            <div className="detail-value">AI · Demand-aware slicing</div>
            <div className="detail-arrow">● <span className="positive">READY</span></div>
          </div>
        </section>
      </div>

      {setNotice && null}
    </>
  )
}

function Analytics() {
  const [selected, setSelected] = useState('Hostel-Block-1')

  return (
    <>
      <div className="eyebrow">Machine learning / 02</div>
      <h1 className="page-title">DEMAND,<br />FORECAST.</h1>
      <p className="page-subtitle">ANALYTICS · ML DEMAND FORECAST & ANOMALY DETECTION</p>

      <div className="content-grid" style={{ marginTop: 30 }}>
        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Device Growth vs AI Predicted Demand</h2>
            <ChartNoAxesCombined size={17} color="#38bdf8" />
          </div>
          <div className="segment-filters" style={{ marginBottom: 20 }}>
            {['Lab-A', 'Hostel-Block-1', 'WiFi-Campus'].map((name) => (
              <button
                key={name}
                className={`filter-button ${selected === name ? 'active' : ''}`}
                onClick={() => setSelected(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="chart-wrap">
            <ResponsiveDemandChart selected={selected} />
          </div>
          <p className="muted small">SOLID = HISTORICAL · DASHED = AI PREDICTED · ILLUSTRATIVE DEMO DATA</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Forecast Model</h2>
            <Cpu size={17} color="#38bdf8" />
          </div>
          <div className="model-card">
            <span className="muted small">MODEL</span>
            <span className="model-name">Random Forest</span>
            <span className="muted small">DEMO MODEL METRIC</span>
            <span className="big-stat">6.2%</span>
            <span className="positive small">MAPE · 30-DAY HORIZON</span>
          </div>
          <div className="model-card">
            <span className="muted small">NEXT PREFIX CHANGE</span>
            <span className="model-name">/48 → /47</span>
            <span className="muted small">{selected.toUpperCase()} · ESTIMATED IN 18 DAYS</span>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2 className="panel-title">Anomaly Alert Feed · Isolation Forest</h2>
          <ShieldAlert size={17} color="#fb7185" />
        </div>
        <div className="alert-row muted">
          <span>TIMESTAMP</span><span>SEGMENT</span><span>ANOMALY TYPE</span><span>SEVERITY</span>
        </div>
        {alerts.map((alert) => (
          <div className="alert-row" key={alert.time}>
            <span className="muted">{alert.time}</span>
            <span className="segment-name">{alert.segment}</span>
            <span>{alert.type}</span>
            <span className={`severity ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
          </div>
        ))}
      </section>
    </>
  )
}

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

function ResponsiveDemandChart({ selected }) {
  const multiplier = selected === 'WiFi-Campus' ? 1.7 : selected === 'Lab-A' ? 0.65 : 1
  const chartData = history.map((point) => ({
    ...point,
    actual: point.actual == null ? null : Math.round(point.actual * multiplier),
    predicted: point.predicted == null ? null : Math.round(point.predicted * multiplier),
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 5, left: -15 }}>
        <CartesianGrid stroke="#202c3e" strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fill: '#8291a7', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
        <YAxis tick={{ fill: '#8291a7', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#0d1421', border: '1px solid #334155', borderRadius: 6 }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Line connectNulls type="monotone" dataKey="actual" name="Historical devices" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line connectNulls type="monotone" dataKey="predicted" name="AI predicted demand" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}


function runSimulation() {
  setRunning(true)
  setNotice('')
  setResult(null)

  window.setTimeout(() => {
    setResult({
      devices: deviceCount,
      wastage: [
        { scale: '100', static: 48, ai: 22 },
        { scale: '1K', static: 55, ai: 25 },
        { scale: '5K', static: 61, ai: 21 },
        { scale: '10K', static: 69, ai: 23 },
      ],
      failures: [
        { scale: '100', static: 8, ai: 3 },
        { scale: '1K', static: 19, ai: 5 },
        { scale: '5K', static: 36, ai: 4 },
        { scale: '10K', static: 52, ai: 4 },
      ],
      latency: [
        { scale: '100', static: 25, ai: 32 },
        { scale: '1K', static: 42, ai: 50 },
        { scale: '5K', static: 70, ai: 84 },
        { scale: '10K', static: 112, ai: 125 },
      ],
      wastageReduction: 66,
      failureReduction: 93,
      latencyOverhead: 84,
      demo: true,
    })

    setNotice(
      'Demo simulation completed. Values are illustrative, not measured benchmarks.'
    )
    setRunning(false)
  }, 700)
}


  
const chartData = [
  { scale: '100', staticW: 48, aiW: 22, staticF: 8, aiF: 3, staticL: 25, aiL: 32 },
  { scale: '1K', staticW: 55, aiW: 25, staticF: 19, aiF: 5, staticL: 42, aiL: 50 },
  { scale: '5K', staticW: 61, aiW: 21, staticF: 36, aiF: 4, staticL: 70, aiL: 84 },
  { scale: '10K', staticW: 69, aiW: 23, staticF: 52, aiF: 4, staticL: 112, aiL: 125 },
]
  

  return (
    <>
      <div className="eyebrow">Performance evaluation / 03</div>
      <h1 className="page-title">STATIC VS.<br />AI-DRIVEN.</h1>
      <p className="page-subtitle">EVALUATION · BENCHMARK AGAINST STATIC ALLOCATION</p>

      <div className="content-grid" style={{ marginTop: 30 }}>
        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Simulation Control</h2>
            <FlaskConical size={17} color="#38bdf8" />
          </div>
          <div className="muted small">SIMULATED DEVICES</div>
          <div className="simulation-value">{deviceCount.toLocaleString()}</div>
          <input
            aria-label="Number of simulated devices"
            className="range-input"
            type="range"
            min="100"
            max="10000"
            step="100"
            value={deviceCount}
            onChange={(event) => setDeviceCount(Number(event.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="muted small">
            <span>100</span><span>10,000</span>
          </div>
          <button className="primary-button full-width" style={{ marginTop: 24 }} disabled={running} onClick={runSimulation}>
            <Zap size={15} /> {running ? 'RUNNING SIMULATION...' : 'RUN SIMULATION'}
          </button>
          {notice && <p className="muted small" style={{ marginTop: 14 }}>{notice}</p>}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2 className="panel-title">Result at {deviceCount.toLocaleString()} Devices</h2>
            <Activity size={17} color="#38bdf8" />
          </div>
          {result ? (
            <>
              <div className="result-grid">
                <div className="result-card">
                  <div className="metric-label">Wastage Reduction</div>
                  <div className="result-value positive">−{result.wastageReduction}%</div>
                </div>
                <div className="result-card">
                  <div className="metric-label">Failure Reduction</div>
                  <div className="result-value positive">−{result.failureReduction}%</div>
                </div>
                <div className="result-card">
                  <div className="metric-label">Latency Overhead</div>
                  <div className="result-value">+{result.latencyOverhead}ms</div>
                </div>
              </div>
              <div className="muted small"><CheckCircle2 size={13} style={{ verticalAlign: 'middle' }} /> {result.demo ? 'ILLUSTRATIVE DEMO RESULT' : 'BACKEND RESULT'}</div>
            </>
          ) : (
            <div className="empty-state">
              <Clock3 size={22} color="#38bdf8" />
              <p>Configure the device scale and run a simulation to view comparison results.</p>
            </div>
          )}
        </section>
      </div>

      <div className="chart-grid">
        <BenchmarkChart title="Address Wastage" subtitle="IDLE ADDRESSES % · LOWER IS BETTER" data={chartData} staticKey="staticW" aiKey="aiW" />
        <BenchmarkChart title="Allocation Failures" subtitle="FAILED REQUESTS · LOWER IS BETTER" data={chartData} staticKey="staticF" aiKey="aiF" />
        <BenchmarkChart title="Execution Overhead" subtitle="LATENCY MS · LOWER IS BETTER" data={chartData} staticKey="staticL" aiKey="aiL" />
      </div>
      <p className="footer-note">Static allocation and AI-driven allocation comparisons use illustrative demo values until connected to the simulation backend.</p>
    </>
  )
}

function BenchmarkChart({ title, subtitle, data, staticKey, aiKey }) {
  return (
    <section className="chart-card">
      <h2 className="panel-title">{title}</h2>
      <p className="muted small">{subtitle}</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 2, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#202c3e" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="scale" tick={{ fill: '#8291a7', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
            <YAxis tick={{ fill: '#8291a7', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0d1421', border: '1px solid #334155', borderRadius: 6 }} />
            <Bar dataKey={staticKey} name="Static allocation" fill="#475569" radius={[3, 3, 0, 0]} />
            <Bar dataKey={aiKey} name="AI-driven allocation" fill="#38bdf8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState('dashboard')
  const [segments, setSegments] = useState(initialSegments)
  const [notice, setNotice] = useState('')

  const navItems = [
    { id: 'dashboard', label: '01 DASHBOARD', icon: LayoutDashboard },
    { id: 'analytics', label: '02 ANALYTICS', icon: ChartNoAxesCombined },
    { id: 'benchmark', label: '03 BENCHMARK', icon: FlaskConical },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Network size={21} /></div>
          <span>V6<span style={{ color: '#38bdf8' }}>·</span>MANAGER</span>
        </div>

        <nav className="top-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-button ${screen === id ? 'active' : ''}`}
              onClick={() => setScreen(id)}
            >
              <Icon size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {label}
            </button>
          ))}
        </nav>

        <div className="top-status">
          <span className="status-dot" /> SYSTEM ONLINE
        </div>
      </header>

      <main className="main-content">
        {screen === 'dashboard' && (
          <>
            <Dashboard segments={segments} setSegments={setSegments} setNotice={setNotice} />
            {notice && <p className="footer-note">{notice}</p>}
          </>
        )}
        {screen === 'analytics' && <Analytics />}
        {screen === 'benchmark' && <Benchmarking />}
      </main>
    </div>
  )
}

export default App
