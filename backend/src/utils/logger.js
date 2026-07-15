import { AsyncLocalStorage } from 'async_hooks'
import fs from 'fs'
import path from 'path'

export const loggerStorage = new AsyncLocalStorage()

const LOGS_DIR = path.join(process.cwd(), 'logs')
const LOG_FILE = path.join(LOGS_DIR, 'debug-trace.log')

function writeLogToFile(logLine) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true })
    }
    fs.appendFile(LOG_FILE, logLine + '\n', (err) => {
      if (err) {
        console.error('[LOGGER_ERROR] Failed to write log to file:', err)
      }
    })
  } catch (err) {
    console.error('[LOGGER_ERROR] Failed to write log to file:', err)
  }
}

// Helper to filter out sensitive keys recursively
export function sanitizeData(data) {
  if (!data) return data
  
  if (typeof data === 'object') {
    if (typeof data.toJSON === 'function') {
      return data.toJSON()
    }
    
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item))
    }
    
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

let logSequence = 0

export function logDebug(message, context = {}) {
  if (process.env.DEBUG_TRACE !== 'true') return

  const store = loggerStorage.getStore()
  const requestId = store?.requestId || 'N/A'
  const timestamp = new Date().toISOString()

  const logPayload = {
    sequence: ++logSequence,
    timestamp,
    level: 'DEBUG',
    requestId,
    message,
    context: sanitizeData(context)
  }

  const logLine = JSON.stringify(logPayload)
  console.log(logLine)
  writeLogToFile(logLine)
}

export function wrapServiceInPlace(serviceName, serviceInstance) {
  for (const [key, value] of Object.entries(serviceInstance)) {
    if (typeof value === 'function') {
      const originalMethod = value
      serviceInstance[key] = async function(...args) {
        logDebug(`[SERVICE_START] Calling ${serviceName}.${key}`, {
          arguments: args
        })
        try {
          const result = await originalMethod.apply(this, args)
          
          // Summarize array results to keep log trace size manageable
          let loggedResult = result
          if (Array.isArray(result)) {
            loggedResult = { count: result.length, summary: 'Array' }
          } else if (result && typeof result === 'object') {
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
    }
  }
}
