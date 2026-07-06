import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)      // { id, ho_ten, vai_tro, chi_nhanh_id }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Kiểm tra session hiện tại khi app load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const res = await axiosClient.get('/me')
          // res is already response.data due to interceptor in axiosClient
          setUser(res.data)
        } catch (err) {
          console.error('Lỗi khi lấy thông tin người dùng:', err)
          setUser(null)
        }
      }
      setLoading(false)
    })

    // Lắng nghe thay đổi auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'SIGNED_IN' && session) {
          try {
            const res = await axiosClient.get('/me')
            setUser(res.data)
          } catch (err) {
            console.error('Lỗi khi lấy thông tin người dùng:', err)
            setUser(null)
          }
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const res = await axiosClient.get('/me')
    setUser(res.data)
    return res.data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
