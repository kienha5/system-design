import crypto from 'crypto'
import { loggerStorage, logDebug } from '../utils/logger.js'

export function requestTraceMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  loggerStorage.run({ requestId }, () => {
    // Log incoming request
    logDebug(`[HTTP_REQUEST_IN] ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'x-request-id': requestId
      },
      query: req.query,
      body: req.body
    })

    // Capture response metrics
    res.on('finish', () => {
      logDebug(`[HTTP_RESPONSE_OUT] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage
      })
    })

    next()
  })
}
