import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        🏢 HomeStay Dorm
      </div>
      
      <div className="menu-title">
        Nghiệp vụ Sale
      </div>
      
      <ul className="sidebar-menu">
        <li>
          <Link 
            to="/dashboard-sale" 
            className={isActive('/dashboard-sale') ? 'active' : ''}
          >
            🏠 Dashboard
          </Link>
        </li>
        <li>
          <Link 
            to="/tiep-nhan-yeu-cau" 
            className={isActive('/tiep-nhan-yeu-cau') || location.pathname.startsWith('/dat-lich-xem-phong') ? 'active' : ''}
          >
            📋 Tiếp nhận yêu cầu
          </Link>
        </li>
        <li>
          <Link 
            to="/lap-phieu-dat-coc" 
            className={isActive('/lap-phieu-dat-coc') ? 'active' : ''}
          >
            📝 Lập phiếu đặt cọc
          </Link>
        </li>
        <li>
          <a href="#" className="disabled" onClick={(e) => e.preventDefault()}>
            💰 Ghi nhận đặt cọc
          </a>
        </li>
        <li>
          <a href="#" className="disabled" onClick={(e) => e.preventDefault()}>
            🚪 Đăng ký trả phòng
          </a>
        </li>
      </ul>
    </aside>
  )
}
