import axiosClient from './axiosClient'

/**
 * Search customers by phone number prefix
 * 
 * @param {string} phone - Phone number query string
 * @returns {Promise<Object>} API Response
 */
export const searchKhachHang = (phone) => {
  return axiosClient.get('/khach-hang', { 
    params: { so_dien_thoai: phone } 
  })
}
