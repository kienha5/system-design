import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/shared/Toast'

export default function DangNhap() {
  const { login } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  
  // Trạng thái khóa đăng nhập (Lockout)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState('')

  useEffect(() => {
    // Đọc số lần sai và thời gian khóa từ LocalStorage khi load trang
    const attempts = parseInt(localStorage.getItem('failed_attempts') || '0')
    setFailedAttempts(attempts)

    const checkLockout = () => {
      const lockoutUntil = parseInt(localStorage.getItem('lockout_until') || '0')
      const now = Date.now()

      if (lockoutUntil && now < lockoutUntil) {
        setIsLocked(true)
        startLockoutCountdown(lockoutUntil)
      } else {
        setIsLocked(false)
        if (lockoutUntil) {
          localStorage.removeItem('lockout_until')
          localStorage.setItem('failed_attempts', '0')
          setFailedAttempts(0)
        }
      }
    }

    checkLockout()
  }, [])

  const startLockoutCountdown = (untilTime) => {
    const updateTimer = () => {
      const now = Date.now()
      const remaining = untilTime - now

      if (remaining <= 0) {
        setIsLocked(false)
        localStorage.removeItem('lockout_until')
        localStorage.setItem('failed_attempts', '0')
        setFailedAttempts(0)
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setLockoutTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isLocked) return

    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      // Reset số lần đăng nhập sai khi thành công
      localStorage.setItem('failed_attempts', '0')
      setFailedAttempts(0)
    } catch (err) {
      console.error('Đăng nhập thất bại:', err)
      const errMessage = err.message || 'Email hoặc mật khẩu không chính xác.'
      setError(errMessage)
      setToastMessage(errMessage)
      
      // Tăng số lần đăng nhập sai
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      localStorage.setItem('failed_attempts', newAttempts.toString())

      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 15 * 60 * 1000 // Khóa 15 phút
        localStorage.setItem('lockout_until', lockoutTime.toString())
        setIsLocked(true)
        startLockoutCountdown(lockoutTime)
        setError('Tài khoản đã bị khóa tạm thời do đăng nhập sai quá 5 lần.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justify: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      margin: 0,
      padding: '16px',
      fontFamily: 'var(--font-family)'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: '32px',
          fontWeight: '800',
          color: 'var(--gray-900)',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          🏢 HomeStay Dorm
        </div>

        <div style={{
          textAlign: 'center',
          color: 'var(--gray-500)',
          fontSize: '14px',
          marginBottom: '32px'
        }}>
          Hệ thống Quản lý Ký túc xá & Homestay
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>❌</span>
            <span>{error}</span>
          </div>
        )}

        {/* Thông báo khóa tài khoản */}
        {isLocked && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            ⚠️ Tài khoản bị khóa do đăng nhập sai 5 lần. <br />
            Vui lòng thử lại sau: <strong>{lockoutTimeLeft}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ opacity: isLocked ? 0.5 : 1 }}>
          <div className="form-group">
            <label htmlFor="email">Email đăng nhập</label>
            <input 
              type="email" 
              id="email" 
              className="input" 
              placeholder="nhânviên@dorm.com" 
              required
              disabled={isLocked || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input 
              type="password" 
              id="password" 
              className="input" 
              placeholder="Nhập mật khẩu" 
              required
              disabled={isLocked || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLocked || loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 700,
              borderRadius: '12px',
              marginTop: '8px'
            }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập ➔'}
          </button>
        </form>

        <div className="hint-box" style={{
          marginTop: '24px',
          background: 'var(--gray-100)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px dashed var(--gray-300)',
          fontSize: '13px',
          color: 'var(--gray-600)'
        }}>
          <strong>💡 Tài khoản thử nghiệm (Email / Pass):</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
            <li style={{ marginBottom: '4px' }}>Sale: <code>sale@dorm.com</code> / <code>123</code></li>
            <li style={{ marginBottom: '4px' }}>Quản lý: <code>quanly@dorm.com</code> / <code>123</code></li>
            <li style={{ marginBottom: '4px' }}>Kế toán: <code>ketoan@dorm.com</code> / <code>123</code></li>
          </ul>
        </div>
      </div>

      {toastMessage && (
        <div className="toast-container">
          <Toast 
            message={toastMessage} 
            type="danger" 
            onClose={() => setToastMessage('')} 
          />
        </div>
      )}
    </div>
  )
}
