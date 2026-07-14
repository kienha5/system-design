/**
 * Controller handling authentication and current user queries.
 */
export const authController = {
  /**
   * Returns the current authenticated user's profile and role.
   * This endpoint is protected by auth.middleware, which populates req.user.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getMe(req, res) {
    // req.user is populated by auth.middleware
    res.json({
      success: true,
      data: {
        id: req.user.id,
        ho_ten: req.user.ho_ten,
        vai_tro: req.user.vai_tro,
        chi_nhanh_id: req.user.chi_nhanh_id,
        email: req.user.email
      }
    })
  }
}
