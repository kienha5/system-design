import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'

export default function DashboardSale() {
  const navigate = useNavigate()

  // Mẫu dữ liệu việc cần làm (Checklist)
  const todoItems = [
    { 
      id: 1, 
      task: 'Lập lịch xem phòng', 
      desc: 'Khách Nguyễn Văn Nam đăng ký xem phòng P101 hôm nay', 
      priority: 'Cao', 
      status: 'Chờ',
      link: '/tiep-nhan-yeu-cau' // Có thể đi tiếp từ Tiếp nhận hoặc xem phòng
    },
    { 
      id: 2, 
      task: 'Lập phiếu đặt cọc', 
      desc: 'Khách hàng có SĐT 0988888888 đã xem phòng xong và đồng ý đặt cọc', 
      priority: 'Cao', 
      status: 'Chờ',
      link: '/lap-phieu-dat-coc'
    },
    { 
      id: 3, 
      task: 'Ghi nhận đặt cọc', 
      desc: 'Kiểm tra chứng từ thanh toán của phiếu cọc PC0001 (Đang chờ)', 
      priority: 'Trung bình', 
      status: 'Đóng',
      disabled: true
    }
  ]

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Bảng điều khiển Sale" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Chào mừng trở lại!</h1>
            <p className="page-subtitle">Dưới đây là tổng quan công việc và các yêu cầu thuê phòng cần xử lý hôm nay.</p>
          </div>

          {/* Khối thống kê (Stats Grid) */}
          <div className="stats-grid">
            <div className="card stat-card">
              <h4>Yêu cầu mới tiếp nhận</h4>
              <h2>12</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': 'var(--warning)' }}>
              <h4>Lịch xem phòng hôm nay</h4>
              <h2>4</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': 'var(--success)' }}>
              <h4>Phiếu đặt cọc chờ xử lý</h4>
              <h2>3</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': 'var(--danger)' }}>
              <h4>Phiếu cọc quá hạn (24h)</h4>
              <h2>1</h2>
            </div>
            <div className="card stat-card" style={{ '--primary': '#8b5cf6' }}>
              <h4>Tỷ lệ chốt cọc tháng</h4>
              <h2>85%</h2>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>⚡ Đi tắt đến nghiệp vụ</h3>

          {/* Lối tắt nhanh (Shortcuts) */}
          <div className="shortcuts-grid">
            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/tiep-nhan-yeu-cau')}
              style={{ borderLeft: '4px solid var(--primary)' }}
            >
              <span className="shortcut-icon">📋</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Tiếp nhận yêu cầu</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Đăng ký tìm phòng & thông tin khách thuê mới</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/lap-phieu-dat-coc')}
              style={{ borderLeft: '4px solid var(--success)' }}
            >
              <span className="shortcut-icon">📝</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Lập phiếu đặt cọc</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Giữ chỗ phòng, giường và tính toán tiền cọc</p>
            </div>

            <div 
              className="card shortcut-card" 
              style={{ opacity: 0.6, cursor: 'not-allowed', borderLeft: '4px solid var(--gray-400)' }}
            >
              <span className="shortcut-icon">💰</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Ghi nhận đặt cọc</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Xác nhận chứng từ thanh toán giữ chỗ (Chưa mở)</p>
            </div>
          </div>

          {/* Danh sách việc cần làm */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📅 Danh sách công việc cần xử lý</h3>
            
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
                {todoItems.map((item) => (
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
                      <span className={`badge ${item.status === 'Chờ' ? 'status-pending' : 'status-maintain'}`}>
                        {item.status === 'Chờ' ? 'Đang chờ' : 'Đã khóa'}
                      </span>
                    </td>
                    <td>
                      {item.disabled ? (
                        <button className="btn btn-sm" disabled>Thực hiện</button>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(item.link)}
                        >
                          Thực hiện ➔
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
    </div>
  )
}
