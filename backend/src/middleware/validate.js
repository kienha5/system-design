import { logDebug } from '../utils/logger.js'

/**
 * Middleware helper to validate request query parameters using a Zod schema.
 * Handles type coercion and returns structured errors matching the api spec.
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate req.query against
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      const issues = result.error.issues || []
      logDebug('[VALIDATION_ERROR] Query validation failed', {
        source: 'query',
        rawInput: req.query,
        errors: issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      })
      const messages = issues.map(err => {
        const field = err.path.join('.')
        return `${field}: ${err.message}`
      }).join(', ')

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages
        }
      })
    }
    
    // Override req.query on this request instance to return the parsed and coerced data
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true
    })
    next()
  }
}

/**
 * Middleware helper to validate request body using a Zod schema.
 * Returns structured errors matching the api spec upon validation failure.
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate req.body against
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const issues = result.error.issues || []
      logDebug('[VALIDATION_ERROR] Body validation failed', {
        source: 'body',
        rawInput: req.body,
        errors: issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      })
      const messages = issues.map(err => {
        const field = err.path.join('.')
        return `${field}: ${err.message}`
      }).join(', ')

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages
        }
      })
    }

    // Assign parsed data back to req.body
    req.body = result.data
    next()
  }
}

/**
 * Middleware helper to validate request path parameters using a Zod schema.
 * Returns structured errors matching the api spec upon validation failure.
 * 
 * @param {z.ZodSchema} schema - Zod schema to validate req.params against
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || []
      logDebug('[VALIDATION_ERROR] Params validation failed', {
        source: 'params',
        rawInput: req.params,
        errors: issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      })
      const messages = issues.map(err => {
        const field = err.path.join('.')
        return `${field}: ${err.message}`
      }).join(', ')

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages
        }
      })
    }

    // Assign parsed data back to req.params
    req.params = result.data
    next()
  }
}
