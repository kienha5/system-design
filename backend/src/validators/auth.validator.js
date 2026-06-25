// Currently, UC01 GET /me has no request body, query, or path parameters to validate.
// This file is created to adhere to the project's Validator -> Service -> Controller -> Route architecture.

/**
 * Validator for GET /me
 * Since GET /me has no inputs, this middleware simply calls next().
 */
export const validateMe = (req, res, next) => {
  next();
};
