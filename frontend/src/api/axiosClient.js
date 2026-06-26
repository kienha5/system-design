import axios from 'axios'
import { supabase } from '../lib/supabaseClient'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// Tự động đính kèm JWT vào mọi request
axiosClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Xử lý lỗi chung
axiosClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const code = err.response?.data?.error?.code
    const message = err.response?.data?.error?.message || 'Lỗi không xác định'
    return Promise.reject({ code, message, status: err.response?.status })
  }
)

export default axiosClient
