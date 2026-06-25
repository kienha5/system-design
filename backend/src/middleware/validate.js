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
      const messages = result.error.errors.map(err => {
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
    
    // Assign parsed and coerced data back to req.query
    req.query = result.data
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
      const messages = result.error.errors.map(err => {
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
      const messages = result.error.errors.map(err => {
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
