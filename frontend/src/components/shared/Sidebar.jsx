import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path) => {
    return location.pathname === path
  }

  const role = user?.vai_tro?.toLowerCase()
  const isSale = role === 'sale'
  const isQuanLy = role === 'quanly' || role === 'quản lý'

  return (
    <aside className="sidebar">
      <div className="logo">
        🏢 HomeStay Dorm
      </div>

      {user && (
        <div style={{ padding: '0 16px 16px 16px', borderBottom: '1px solid var(--gray-200)', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>Người dùng</div>
          <div style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: '14px', marginTop: '2px' }}>{user.ho_ten}</div>
          <div className="badge" style={{ marginTop: '6px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '11px' }}>
            {user.vai_tro}
          </div>
        </div>
      )}
      
      {isSale && (
        <>
          <div className="menu-title">
            Nghiệp vụ Sale
          </div>
          <ul className="sidebar-menu">
            <li>
              <Link 
                to="/dashboard-sale" 
                className={isActive('/dashboard-sale') ? 'active' : ''}
              >
                🏠 Dashboard Sale
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
              <Link 
                to="/ghi-nhan-dat-coc" 
                className={isActive('/ghi-nhan-dat-coc') ? 'active' : ''}
              >
                💰 Ghi nhận đặt cọc
              </Link>
            </li>
          </ul>
        </>
      )}

      {isQuanLy && (
        <>
          <div className="menu-title">
            Nghiệp vụ Quản Lý
          </div>
          <ul className="sidebar-menu">
            <li>
              <Link 
                to="/dashboard-quan-ly" 
                className={isActive('/dashboard-quan-ly') ? 'active' : ''}
              >
                🏠 Dashboard Quản Lý
              </Link>
            </li>
            <li>
              <Link 
                to="/ghi-nhan-dat-coc" 
                className={isActive('/ghi-nhan-dat-coc') ? 'active' : ''}
              >
                💰 Xác nhận đặt cọc
              </Link>
            </li>
            <li>
              <Link 
                to="/lap-hop-dong" 
                className={isActive('/lap-hop-dong') ? 'active' : ''}
              >
                ✍️ Lập hợp đồng thuê
              </Link>
            </li>
          </ul>
        </>
      )}

      {!isSale && !isQuanLy && user && (
        <>
          <div className="menu-title">Nghiệp vụ</div>
          <ul className="sidebar-menu">
            <li>
              <span style={{ padding: '10px 16px', display: 'block', color: 'var(--gray-400)' }}>
                Chưa cấu hình menu
              </span>
            </li>
          </ul>
        </>
      )}
    </aside>
  )
}

