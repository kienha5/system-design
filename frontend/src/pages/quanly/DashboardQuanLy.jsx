import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import { getThongKeQuanLy } from '../../api/thongKe.api'

export default function DashboardQuanLy() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getThongKeQuanLy()
      .then(res => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Lỗi khi tải thống kê Quản lý:', err)
        setError(true)
        setLoading(false)
      })
  }, [])

  // Checklist items for Manager
  const managerTasks = [
    {
      id: 1,
      task: 'Kiểm tra điều kiện cư trú',
      desc: 'Hồ sơ thành viên hợp đồng cần được phê duyệt điều kiện cư trú trước khi ký hợp đồng chính thức.',
      priority: 'Cao',
      status: 'Chờ',
      link: '/lap-hop-dong'
    },
    {
      id: 2,
      task: 'Xác nhận chứng từ giữ phòng',
      desc: 'Kiểm tra chứng từ chuyển khoản giữ chỗ và phê duyệt trạng thái giữ phòng.',
      priority: 'Trung bình',
      status: 'Chờ',
      link: '/ghi-nhan-dat-coc'
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
            <p className="page-subtitle">Hệ thống quản lý phê duyệt đặt cọc, kiểm tra điều kiện cư trú và ký hợp đồng thuê ký túc xá.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="card stat-card stat-card-primary">
              <h4>Hợp đồng đang hiệu lực</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.hop_dong_hieu_luc ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-warning">
              <h4>Chờ xác nhận thanh toán</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.phieu_cho_xac_nhan ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-danger">
              <h4>HĐ hết hạn trong 30 ngày</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.hop_dong_sap_het_han ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-success">
              <h4>Phòng đang có người ở</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.phong_dang_thue ?? 0
                )}
              </h2>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>⚡ Nghiệp vụ quản lý nhanh</h3>

          {/* Shortcut cards */}
          <div className="shortcuts-grid">
            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/lap-hop-dong')}
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <span className="shortcut-icon">📋</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Ký hợp đồng</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Kiểm tra điều kiện cư trú và ký kích hoạt hợp đồng chính thức</p>
            </div>

            <div 
              className="card shortcut-card" 
              style={{ opacity: 0.6, cursor: 'not-allowed', borderLeft: '4px solid var(--gray-400)' }}
            >
              <span className="shortcut-icon">🏠</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Giao phòng cho khách</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Thực hiện bàn giao tài sản và nhận phòng (Truy cập từ chi tiết hợp đồng)</p>
            </div>

            <div 
              className="card shortcut-card" 
              style={{ opacity: 0.6, cursor: 'not-allowed', borderLeft: '4px solid var(--gray-400)' }}
            >
              <span className="shortcut-icon">🔍</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Kiểm tra phòng khi trả</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Đối soát bàn giao tài sản khi trả phòng (Truy cập từ thông báo trả phòng)</p>
            </div>

            <div 
              className="card shortcut-card" 
              style={{ opacity: 0.6, cursor: 'not-allowed', borderLeft: '4px solid var(--gray-400)' }}
            >
              <span className="shortcut-icon">📄</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Kết thúc hợp đồng</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Thanh lý hợp đồng và hoàn tất các thủ tục tài chính (Truy cập từ biên bản trả phòng)</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/ghi-nhan-dat-coc')}
              style={{ borderLeft: '4px solid var(--warning)' }}
            >
              <span className="shortcut-icon">🏢</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Quản lý trạng thái phòng</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Cập nhật trạng thái và phê duyệt chứng từ đặt giữ chỗ phòng</p>
            </div>
          </div>

          {/* Tasks table */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📋 Nhiệm vụ quản lý cần xử lý</h3>
            
            <table className="room-table">
              <thead>
                <tr>
                  <th>Nhiệm vụ</th>
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
