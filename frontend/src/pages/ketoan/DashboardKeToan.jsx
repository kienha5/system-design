import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'

export default function DashboardKeToan() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Sample tasks list for Accountant
  const accountantTasks = [
    {
      id: 1,
      task: 'Thu tiền phòng kỳ đầu',
      desc: 'Hợp đồng HD000001 đã có hiệu lực, cần lập hóa đơn và thu tiền phòng kỳ đầu trước khi bàn giao phòng.',
      priority: 'Cao',
      status: 'Chờ',
      link: '/thanh-toan-ky-dau/select' // We'll handle a selector if they go from here, or simple info
    },
    {
      id: 2,
      task: 'Xác nhận chuyển khoản',
      desc: 'Hóa đơn HD000002 của phòng P102 báo đã chuyển khoản thành công, cần đối chiếu giao dịch ngân hàng.',
      priority: 'Cao',
      status: 'Chờ',
      link: '/dashboard-ke-toan'
    }
  ]

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Bảng điều khiển Kế toán" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Tổng quan Nghiệp vụ Kế toán</h1>
            <p className="page-subtitle">Hệ thống quản lý tài chính, lập hóa đơn định kỳ, thu tiền phòng kỳ đầu và đối soát công nợ.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="card stat-card" style={{ '--primary': '#10b981' }}>
              <h4>Doanh thu tháng này</h4>
              <h2>78.5 Mđ</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': '#f59e0b' }}>
              <h4>Hóa đơn chờ thu</h4>
              <h2>4</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': '#3b82f6' }}>
              <h4>Tỷ lệ thu hồi nợ</h4>
              <h2>94.2%</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': '#ef4444' }}>
              <h4>Hóa đơn quá hạn</h4>
              <h2>1</h2>
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
                  <th>Nghiệp vụ</th>
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
                      {item.link === '/dashboard-ke-toan' ? (
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => alert('Đối chiếu thành công! Đang xử lý giao dịch.')}
                        >
                          Đối chiếu ➔
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            alert('Vui lòng truy cập từ danh sách Hợp đồng của Quản lý hoặc Sale để thực hiện thanh toán kỳ đầu cho từng hợp đồng cụ thể.')
                          }}
                        >
                          Xử lý ➔
                        </button>
                      )}
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
