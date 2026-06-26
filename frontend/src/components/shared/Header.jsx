import { useAuth } from '../../context/AuthContext'

export default function Header({ title }) {
  const { user, logout } = useAuth()

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      // Lấy chữ cái đầu của 2 từ cuối hoặc 2 từ đầu
      // Thường lấy từ đầu và từ cuối: ví dụ "Nguyễn Thị Sale" -> "N" và "S" hoặc "T" và "S"
      // Lấy 2 chữ cái đầu của 2 từ đầu tiên cho đơn giản
      return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    if (window.confirm('Xác nhận đăng xuất khỏi hệ thống?')) {
      await logout()
    }
  }

  return (
    <header className="header">
      <h3>{title}</h3>
      
      {user && (
        <div className="user-box">
          <div className="user-avatar">
            {getInitials(user.ho_ten)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '14px' }}>
              {user.ho_ten}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 500 }}>
              {user.vai_tro}
            </span>
          </div>
          
          <button 
            className="btn btn-danger btn-sm" 
            onClick={handleLogout}
            style={{ marginLeft: '12px', padding: '6px 12px' }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  )
}
