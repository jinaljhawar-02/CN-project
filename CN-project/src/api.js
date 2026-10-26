// All calls use relative URLs. vite.config.js proxies /api -> http://127.0.0.1:5000
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export const getSegments = () => request('/api/segments')
export const getAnomalies = () => request('/api/anomalies')

export const runAllocation = (day_of_week = 0, is_weekend = 0) =>
  request('/api/allocate', {
    method: 'POST',
    body: JSON.stringify({ day_of_week, is_weekend }),
  })

export const runSimulation = (devices) =>
  request('/api/simulate', {
    method: 'POST',
    body: JSON.stringify({ devices }),
  })