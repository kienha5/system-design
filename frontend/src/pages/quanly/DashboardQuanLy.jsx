import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'

export default function DashboardQuanLy() {
  const navigate = useNavigate()

  // Checklist items for Manager
  const managerTasks = [
    {
      id: 1,
      task: 'Xác nhận đặt cọc',
      desc: 'Phiếu đặt cọc PC0001 đã được Sale tải lên chứng từ chuyển khoản và đang chờ phê duyệt',
      priority: 'Cao',
      status: 'Chờ',
      link: '/ghi-nhan-dat-coc'
    },
    {
      id: 2,
      task: 'Lập hợp đồng thuê',
      desc: 'Phiếu đặt cọc PC0002 đã được xác nhận thanh toán thành công, đủ điều kiện tiến hành lập hợp đồng',
      priority: 'Cao',
      status: 'Chờ',
      link: '/lap-hop-dong'
    }
  ]

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Bảng điều khiển Quản lý" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Tổng quan Nghiệp vụ Quản lý</h1>
            <p className="page-subtitle">Hệ thống quản lý phê duyệt đặt cọc, kiểm tra điều kiện cư trú và lập hợp đồng thuê ký túc xá.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="card stat-card" style={{ '--primary': 'var(--primary)' }}>
              <h4>Hợp đồng hiệu lực</h4>
              <h2>15</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': 'var(--warning)' }}>
              <h4>Chứng từ chờ duyệt</h4>
              <h2>3</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': 'var(--success)' }}>
              <h4>Phòng đang cho thuê</h4>
              <h2>8 / 10</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': '#8b5cf6' }}>
              <h4>Doanh thu giữ chỗ</h4>
              <h2>24.0Mđ</h2>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>⚡ Nghiệp vụ quản lý nhanh</h3>

          {/* Shortcut cards */}
          <div className="shortcuts-grid">
            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/ghi-nhan-dat-coc')}
              style={{ borderLeft: '4px solid var(--warning)' }}
            >
              <span className="shortcut-icon">💰</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Xác nhận đặt cọc</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Phê duyệt/Từ chối chứng từ thanh toán giữ chỗ từ Sale</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/lap-hop-dong')}
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <span className="shortcut-icon">✍️</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Lập hợp đồng thuê</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Kiểm tra điều kiện cư trú và kích hoạt hợp đồng chính thức</p>
            </div>
          </div>

          {/* Tasks table */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📋 Nhiệm vụ quản lý cần xử lý</h3>
            
            <table className="room-table">
              <thead>
                <tr>
                  <th>Nghiệp vụ</th>
                  <th>Mô tả chi tiết</th>
                  <th>Độ ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {managerTasks.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.task}</strong></td>
                    <td style={{ color: 'var(--gray-600)' }}>{item.desc}</td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          background: item.priority === 'Cao' ? '#fee2e2' : '#f1f5f9',
                          color: item.priority === 'Cao' ? '#ef4444' : '#64748b'
                        }}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge status-pending">
                        Đang chờ
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(item.link)}
                      >
                        Xử lý ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
