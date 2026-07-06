import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { getThongKeKeToan } from '../../api/thongKe.api'

export default function DashboardKeToan() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    getThongKeKeToan()
      .then(res => {
        setStats(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Lỗi khi tải thống kê Kế toán:', err)
        setError(true)
        setLoading(false)
      })
  }, [])

  // Sample tasks list for Accountant (using friendly terms)
  const accountantTasks = [
    {
      id: 1,
      task: 'Thu tiền tháng đầu',
      desc: 'Hợp đồng mới đã có hiệu lực, cần lập hóa đơn và thu tiền phòng tháng đầu trước khi bàn giao phòng.',
      priority: 'Cao',
      status: 'Chờ',
      link: '/dashboard-ke-toan'
    },
    {
      id: 2,
      task: 'Tính tiền hoàn cọc',
      desc: 'Biên bản trả phòng mới được xác nhận, cần tính toán khấu trừ tài sản và hoàn trả tiền cọc cho khách.',
      priority: 'Cao',
      status: 'Chờ',
      link: '/dashboard-ke-toan'
    }
  ]

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Bảng điều khiển Kế toán" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Tổng quan Nghiệp vụ Kế toán</h1>
            <p className="page-subtitle">Hệ thống quản lý tài chính, lập hóa đơn định kỳ, thu tiền phòng tháng đầu và đối soát công nợ.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="card stat-card stat-card-danger">
              <h4>Hóa đơn chưa thanh toán</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.hoa_don_cho_thanh_toan ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-success">
              <h4>Đã thu tháng này</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.hoa_don_thang_nay ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-primary">
              <h4>Doanh thu tháng này</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  formatVND(stats?.doanh_thu_thang_nay)
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-warning">
              <h4>Chờ tính hoàn cọc</h4>
              <h2>
                {loading ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : error ? (
                  '-'
                ) : (
                  stats?.bien_ban_cho_khau_tru ?? 0
                )}
              </h2>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>⚡ Nghiệp vụ kế toán nhanh</h3>

          {/* Shortcut cards */}
          <div className="shortcuts-grid">
            <div 
              className="card shortcut-card" 
              onClick={() => showToast('Chức năng Quản lý hóa đơn định kỳ đang được chuẩn bị.', 'warning')}
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <span className="shortcut-icon">🧾</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Hóa đơn định kỳ</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Lập và gửi hóa đơn tiền phòng, điện nước hàng tháng</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => showToast('Chức năng Báo cáo công nợ đang được chuẩn bị.', 'warning')}
              style={{ borderLeft: '4px solid var(--success)' }}
            >
              <span className="shortcut-icon">📊</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Báo cáo công nợ</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Thống kê tổng hợp số liệu thu chi và công nợ khách thuê</p>
            </div>
          </div>

          {/* Tasks table */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📋 Danh sách công việc cần xử lý</h3>
            
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
                {accountantTasks.map((item) => (
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
                        onClick={() => {
                          showToast('Vui lòng thực hiện tác vụ này từ danh sách tương ứng của Quản lý hoặc Sale.', 'warning')
                        }}
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

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}
