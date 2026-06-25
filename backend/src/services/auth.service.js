import sql from '../db.js'

/**
 * Service handling authentication-related queries.
 */
export const authService = {
  /**
   * Retrieves the system user record associated with a Supabase Auth ID.
   * 
   * @param {string} userId - The UUID of the user from Supabase Auth (sub field in JWT)
   * @returns {Promise<Object|null>} The user record containing id, ho_ten, vai_tro, and chi_nhanh_id, or null if not found.
   */
  async getCurrentUser(userId) {
    const [user] = await sql`
      SELECT id, ho_ten, vai_tro, chi_nhanh_id
      FROM nguoi_dung_he_thong
      WHERE id = ${userId}
    `
    return user || null
  }
}
