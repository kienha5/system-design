import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import { getThongKeSale } from '../../api/thongKe.api'
import axiosClient from '../../api/axiosClient'

export default function DashboardSale() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [errorStats, setErrorStats] = useState(false)
  const [errorInquiries, setErrorInquiries] = useState(false)

  useEffect(() => {
    getThongKeSale()
      .then(res => {
        setStats(res.data)
        setLoadingStats(false)
      })
      .catch(err => {
        console.error('Lỗi khi tải thống kê Sale:', err)
        setErrorStats(true)
        setLoadingStats(false)
      })

    axiosClient.get('/nhu-cau-thue', { params: { trang_thai: 'MoiTiepNhan', pageSize: 5 } })
      .then(res => {
        setInquiries(res.data || [])
        setLoadingInquiries(false)
      })
      .catch(err => {
        console.error('Lỗi khi tải danh sách khách mới:', err)
        setErrorInquiries(true)
        setLoadingInquiries(false)
      })
  }, [])

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
            <div className="card stat-card stat-card-primary">
              <h4>Khách đăng ký hôm nay</h4>
              <h2>
                {loadingStats ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : errorStats ? (
                  '-'
                ) : (
                  stats?.yeu_cau_moi ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-warning">
              <h4>Lịch xem phòng hôm nay</h4>
              <h2>
                {loadingStats ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : errorStats ? (
                  '-'
                ) : (
                  stats?.lich_xem_hom_nay ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-success">
              <h4>Phiếu giữ phòng đang xử lý</h4>
              <h2>
                {loadingStats ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : errorStats ? (
                  '-'
                ) : (
                  stats?.phieu_cho_xu_ly ?? 0
                )}
              </h2>
            </div>
            <div className="card stat-card stat-card-danger">
              <h4>Phiếu sắp hết hạn (&lt; 2h)</h4>
              <h2>
                {loadingStats ? (
                  <span style={{ fontSize: '16px', color: 'var(--gray-400)' }}>Đang tải...</span>
                ) : errorStats ? (
                  '-'
                ) : (
                  stats?.phieu_sap_het_han ?? 0
                )}
              </h2>
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
              <span className="shortcut-icon">👤</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Đăng ký khách mới</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Đăng ký tìm phòng & thông tin khách thuê mới</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/lap-phieu-dat-coc')}
              style={{ borderLeft: '4px solid var(--success)' }}
            >
              <span className="shortcut-icon">🔑</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Giữ phòng</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Giữ chỗ phòng, giường và tính toán tiền cọc</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/ghi-nhan-dat-coc')}
              style={{ borderLeft: '4px solid var(--warning)' }}
            >
              <span className="shortcut-icon">✅</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Xác nhận thanh toán cọc</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Xác nhận chứng từ thanh toán giữ chỗ</p>
            </div>

            <div 
              className="card shortcut-card" 
              onClick={() => navigate('/dang-ky-tra-phong')}
              style={{ borderLeft: '4px solid var(--danger)' }}
            >
              <span className="shortcut-icon">🚪</span>
              <h4 style={{ color: 'var(--gray-800)', marginBottom: '4px' }}>Trả phòng</h4>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Đăng ký làm thủ tục trả phòng cho khách</p>
            </div>
          </div>

          {/* Danh sách việc cần làm */}
          <div className="card">
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📅 Danh sách khách mới đăng ký chờ xử lý</h3>
            
            {loadingInquiries ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)' }}>Đang tải danh sách...</div>
            ) : errorInquiries ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>Không thể tải dữ liệu.</div>
            ) : inquiries.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)' }}>Không có khách mới đăng ký cần xử lý hôm nay.</div>
            ) : (
              <table className="room-table">
                <thead>
                  <tr>
                    <th>Tên khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Loại phòng yêu cầu</th>
                    <th>Thời gian đăng ký</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.ho_ten}</strong></td>
                      <td style={{ color: 'var(--gray-600)' }}>{item.so_dien_thoai}</td>
                      <td style={{ color: 'var(--gray-600)' }}>{item.loai_phong_yeu_cau || 'Không yêu cầu'}</td>
                      <td style={{ color: 'var(--gray-600)' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td>
                        <span className="badge status-pending">
                          Mới tiếp nhận
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/dat-lich-xem-phong/${item.id}`)}
                        >
                          Xử lý ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
