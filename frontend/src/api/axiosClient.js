import axios from 'axios'
import { supabase } from '../lib/supabaseClient'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// Mask sensitive keys recursively
function sanitizeData(data) {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item))
  }
  if (typeof data === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      if (['password', 'token', 'access_token', 'so_cmnd_cccd', 'cccd', 'authorization'].includes(lowerKey)) {
        sanitized[key] = '***'
      } else {
        sanitized[key] = sanitizeData(value)
      }
    }
    return sanitized
  }
  return data
}

// Automatically detect calling page/component and function
function getCallerInfo() {
  const stack = new Error().stack
  if (!stack) return { file: 'unknown', function: 'unknown' }
  const lines = stack.split('\n')
  for (const line of lines) {
    if (line.includes('/src/') && !line.includes('axiosClient.js')) {
      const fnMatch = line.match(/at\s+([^\s(]+)/)
      const fileMatch = line.match(/\/src\/([^?#:\s]+)/)
      return {
        file: fileMatch ? fileMatch[1] : 'unknown',
        function: fnMatch ? fnMatch[1] : 'anonymous'
      }
    }
  }
  return { file: 'unknown', function: 'unknown' }
}

function logDebug(message, context = {}) {
  if (import.meta.env.VITE_DEBUG_TRACE !== 'true') return
  
  const logPayload = {
    timestamp: new Date().toISOString(),
    level: 'DEBUG',
    message,
    context: sanitizeData(context)
  }
  console.log('[DEBUG_TRACE]', logPayload)
}

// Tự động đính kèm JWT vào mọi request
axiosClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Trace request metrics and caller info
axiosClient.interceptors.request.use((config) => {
  const { file, function: fnName } = getCallerInfo()
  config.metadata = { startTime: Date.now(), callerFile: file, callerFunction: fnName }

  logDebug(`[API_REQUEST] Sending ${config.method?.toUpperCase()} ${config.url}`, {
    method: config.method?.toUpperCase(),
    url: config.url,
    caller: { file, function: fnName },
    headers: config.headers,
    params: config.params,
    data: config.data
  })

  return config
})

// Response handler and logger
axiosClient.interceptors.response.use(
  (res) => {
    const duration = Date.now() - (res.config.metadata?.startTime || Date.now())
    const caller = res.config.metadata || {}
    
    logDebug(`[API_RESPONSE] Success ${res.config.method?.toUpperCase()} ${res.config.url} (${duration}ms)`, {
      method: res.config.method?.toUpperCase(),
      url: res.config.url,
      statusCode: res.status,
      caller: { file: caller.callerFile, function: caller.callerFunction },
      durationMs: duration,
      response: res.data
    })
    
    return res.data
  },
  (err) => {
    const duration = Date.now() - (err.config?.metadata?.startTime || Date.now())
    const caller = err.config?.metadata || {}
    const status = err.response?.status
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message || 'Lỗi không xác định'
    
    logDebug(`[API_RESPONSE_ERROR] Failed ${err.config?.method?.toUpperCase()} ${err.config?.url} (${duration}ms)`, {
      method: err.config?.method?.toUpperCase(),
      url: err.config?.url,
      statusCode: status,
      caller: { file: caller.callerFile, function: caller.callerFunction },
      durationMs: duration,
      error: { code, message }
    })
    
    return Promise.reject({ code, message, status })
  }
)

export default axiosClient
