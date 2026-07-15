import { AsyncLocalStorage } from 'async_hooks'

export const loggerStorage = new AsyncLocalStorage()

// Helper to filter out sensitive keys recursively
export function sanitizeData(data) {
  if (!data) return data
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item))
  }
  if (typeof data === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      if (['password', 'token', 'access_token', 'so_cmnd_cccd', 'cccd'].includes(key)) {
        sanitized[key] = '***'
      } else {
        sanitized[key] = sanitizeData(value)
      }
    }
    return sanitized
  }
  return data
}

export function logDebug(message, context = {}) {
  if (process.env.DEBUG_TRACE !== 'true') return

  const store = loggerStorage.getStore()
  const requestId = store?.requestId || 'N/A'
  const timestamp = new Date().toISOString()

  const logPayload = {
    timestamp,
    level: 'DEBUG',
    requestId,
    message,
    context: sanitizeData(context)
  }

  console.log(JSON.stringify(logPayload))
}

export function traceService(serviceName, serviceObject) {
  const traced = {}
  for (const [key, value] of Object.entries(serviceObject)) {
    if (typeof value === 'function') {
      traced[key] = async function(...args) {
        logDebug(`[SERVICE_START] Calling ${serviceName}.${key}`, {
          arguments: args
        })
        try {
          const result = await value.apply(this, args)
          
          // Summarize array results to keep log trace size manageable
          let loggedResult = result
          if (Array.isArray(result)) {
            loggedResult = { count: result.length, summary: 'Array' }
          } else if (result && typeof result === 'object') {
            // If it has multiple rows (like paginated data)
            if (Array.isArray(result.rooms)) {
              loggedResult = { ...result, rooms: { count: result.rooms.length, summary: 'Array' } }
            }
          }
          
          logDebug(`[SERVICE_END] ${serviceName}.${key} succeeded`, {
            result: loggedResult
          })
          return result
        } catch (err) {
          logDebug(`[SERVICE_ERROR] ${serviceName}.${key} failed`, {
            error: {
              message: err.message,
              code: err.code
            }
          })
          throw err
        }
      }
    } else {
      traced[key] = value
    }
  }
  return traced
}
