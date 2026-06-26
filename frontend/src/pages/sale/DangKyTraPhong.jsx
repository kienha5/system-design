import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { searchHopDong, getHopDong } from '../../api/hopDong.api'
import { dangKyTraPhong, capNhatNgayHen } from '../../api/bienBanTraPhong.api'

export default function DangKyTraPhong() {
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  
  const [selectedContract, setSelectedContract] = useState(null)
  const [loadingContract, setLoadingContract] = useState(false)
  
  // Checkout registration states
  const [ngayTraPhongDuKien, setNgayTraPhongDuKien] = useState(new Date().toISOString().split('T')[0])
  const [ngayHenMoi, setNgayHenMoi] = useState(new Date().toISOString().split('T')[0])
  
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Search contracts by code, phone number, or name
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoadingSearch(true)
    setSelectedContract(null)
    setSearchResults([])
    setToast(null)

    try {
      const res = await searchHopDong(searchQuery.trim())
      if (res.success) {
        setSearchResults(res.data)
        if (res.data.length === 0) {
          showToast('Không tìm thấy hợp đồng nào phù hợp với từ khóa.', 'warning')
        } else if (res.data.length === 1) {
          // If only 1 result, load its details directly
          handleSelectContract(res.data[0])
        }
      } else {
        showToast(res.error?.message || 'Lỗi tìm kiếm hợp đồng.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Lỗi tìm kiếm hợp đồng.', 'danger')
    } finally {
      setLoadingSearch(false)
    }
  }

  // Load contract and its checkout report details
  const handleSelectContract = async (contractItem) => {
    setLoadingContract(true)
    setToast(null)
    try {
      const res = await getHopDong(contractItem.id)
      if (res.success) {
        // Fetch full contract details and attach checkout info from search
        const fullContract = res.data
        setSelectedContract({
          ...fullContract,
          bien_ban_tra_phong_id: contractItem.bien_ban_tra_phong_id,
          bien_ban_tra_phong_trang_thai: contractItem.bien_ban_tra_phong_trang_thai
        })
        
        // Default checkout dates
        const todayStr = new Date().toISOString().split('T')[0]
        setNgayTraPhongDuKien(todayStr)
        setNgayHenMoi(todayStr)
        
        setSearchResults([])
        setSearchQuery('')
      } else {
        showToast(res.error?.message || 'Không thể tải thông tin chi tiết hợp đồng.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Lỗi tải chi tiết hợp đồng.', 'danger')
    } finally {
      setLoadingContract(false)
    }
  }

  // Register a new checkout (UC12 POST)
  const handleRegisterCheckout = async () => {
    if (!selectedContract) return

    setActionLoading(true)
    try {
      const payload = {
        hop_dong_id: selectedContract.id,
        ngay_tra_phong_du_kien: ngayTraPhongDuKien
      }
      const res = await dangKyTraPhong(payload)
      if (res.success) {
        showToast('Đăng ký trả phòng thành công!', 'success')
        
        // Update contract checkout info in state
        setSelectedContract(prev => ({
          ...prev,
          bien_ban_tra_phong_id: res.data.id,
          bien_ban_tra_phong_trang_thai: res.data.trang_thai,
          ngay_tra_phong_du_kien_details: res.data.ngay_tra_phong_du_kien
        }))
      } else {
        showToast(res.error?.message || 'Đăng ký trả phòng thất bại.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi đăng ký trả phòng.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  // Change scheduled checkout date (UC12 PATCH)
  const handleChangeAppointmentDate = async () => {
    if (!selectedContract?.bien_ban_tra_phong_id) return

    setActionLoading(true)
    try {
      const res = await capNhatNgayHen(selectedContract.bien_ban_tra_phong_id, ngayHenMoi)
      if (res.success) {
        showToast('Đã cập nhật ngày hẹn trả phòng mới thành công!', 'success')
        
        // Update contract state with new date
        setSelectedContract(prev => ({
          ...prev,
          ngay_tra_phong_du_kien_details: res.data.ngay_tra_phong_du_kien
        }))
      } else {
        showToast(res.error?.message || 'Cập nhật ngày hẹn thất bại.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi cập nhật ngày hẹn.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN')
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'HieuLuc': return 'badge badge-success'
      case 'DaThanhLy': return 'badge badge-danger'
      case 'DaHuy': return 'badge badge-gray'
      case 'ChoDoiSoat': return 'badge badge-warning'
      case 'ChoXacNhan': return 'badge badge-info'
      default: return 'badge badge-gray'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'HieuLuc': return 'Hiệu Lực'
      case 'DaThanhLy': return 'Đã Thanh Lý'
      case 'DaHuy': return 'Đã Hủy'
      case 'ChoDoiSoat': return 'Chờ Đối Soát'
      case 'ChoXacNhan': return 'Chờ Xác Nhận'
      default: return status
    }
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Đăng ký trả phòng & hoàn cọc" />
        
        <div className="content">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          
          <div className="page-header">
            <h1 className="page-title">Tiếp nhận yêu cầu trả phòng (UC12)</h1>
            <p className="page-subtitle">Tìm kiếm hợp đồng thuê đang có hiệu lực để lên lịch hẹn trả phòng và khởi tạo quy trình bàn giao.</p>
          </div>

          {/* Search Contract Section */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>🔍 Tìm kiếm hợp đồng</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập mã hợp đồng, số điện thoại hoặc họ tên khách hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loadingSearch || loadingContract}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingSearch || loadingContract || !searchQuery.trim()}
              >
                {loadingSearch ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>📋 Hợp đồng tìm thấy</h3>
              <table className="room-table">
                <thead>
                  <tr>
                    <th>Mã hợp đồng</th>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Phòng</th>
                    <th>Ngày bắt đầu</th>
                    <th>Trạng thái HĐ</th>
                    <th>Đăng ký trả</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.ma_hop_dong}</td>
                      <td>{c.ten_khach_hang}</td>
                      <td>{c.sdt_khach_hang}</td>
                      <td>{c.ma_phong}</td>
                      <td>{formatDate(c.ngay_bat_dau)}</td>
                      <td>
                        <span className={getStatusBadgeClass(c.trang_thai)}>
                          {getStatusText(c.trang_thai)}
                        </span>
                      </td>
                      <td>
                        {c.bien_ban_tra_phong_id ? (
                          <span className={getStatusBadgeClass(c.bien_ban_tra_phong_trang_thai)}>
                            {getStatusText(c.bien_ban_tra_phong_trang_thai)}
                          </span>
                        ) : (
                          <span className="badge badge-gray">Chưa đăng ký</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleSelectContract(c)}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loadingContract && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
              <p>Đang tải thông tin hợp đồng...</p>
            </div>
          )}

          {/* Contract Details and Checkout Flow */}
          {selectedContract && !loadingContract && (
            <div className="grid grid-2" style={{ gap: '24px' }}>
              
              {/* Left Column: Contract Info */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--gray-800)' }}>📄 Thông tin hợp đồng</h3>
                  <span className={getStatusBadgeClass(selectedContract.trang_thai)}>
                    HĐ: {getStatusText(selectedContract.trang_thai)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Mã hợp đồng:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedContract.ma_hop_dong}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Phòng thuê:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{selectedContract.ma_phong} ({selectedContract.loai_phong})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Giá thuê/giường:</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                      {new Intl.NumberFormat('vi-VN').format(selectedContract.gia_thue_theo_giuong)} đ
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Ngày ký:</span>
                    <span style={{ color: 'var(--gray-800)' }}>{formatDate(selectedContract.ngay_ky)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Ngày bắt đầu thuê:</span>
                    <span style={{ color: 'var(--gray-800)' }}>{formatDate(selectedContract.ngay_bat_dau)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Kỳ thanh toán:</span>
                    <span style={{ color: 'var(--gray-800)' }}>{selectedContract.ky_thanh_toan}</span>
                  </div>
                  
                  <div style={{ marginTop: '16px', borderTop: '1px dashed var(--gray-200)', paddingTop: '16px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--gray-700)' }}>👥 Thành viên trong hợp đồng</h4>
                    <table className="room-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Họ tên</th>
                          <th>Số điện thoại</th>
                          <th>Giường</th>
                          <th>Cư trú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedContract.thanh_vien?.map((m) => (
                          <tr key={m.id}>
                            <td>{m.ho_ten}</td>
                            <td>{m.so_dien_thoai}</td>
                            <td>{m.ma_giuong || 'N/A'}</td>
                            <td>
                              <span className={m.dat_dieu_kien_cu_tru ? 'badge badge-success' : 'badge badge-danger'} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                {m.dat_dieu_kien_cu_tru ? 'Đạt' : 'Bị loại'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout registration flow */}
              <div className="card">
                <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', color: 'var(--gray-800)' }}>
                  🚪 Trạng thái trả phòng
                </h3>

                {selectedContract.trang_thai !== 'HieuLuc' ? (
                  <div className="alert alert-danger" style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b' }}>
                    <strong>Cảnh báo:</strong> Hợp đồng này đã ở trạng thái <strong>{getStatusText(selectedContract.trang_thai)}</strong>. Chỉ các hợp đồng đang ở trạng thái <strong>Hiệu Lực</strong> mới được đăng ký trả phòng.
                  </div>
                ) : selectedContract.bien_ban_tra_phong_id ? (
                  /* ALREADY REGISTERED CHECKOUT FLOW */
                  <div>
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', color: '#92400e', marginBottom: '20px' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>
                        Hợp đồng này đã đăng ký trả phòng trước đó!
                      </p>
                      <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                        <div>Trạng thái biên bản:</div>
                        <div style={{ fontWeight: 700 }}>
                          {getStatusText(selectedContract.bien_ban_tra_phong_trang_thai)}
                        </div>
                        <div>Hẹn trả dự kiến:</div>
                        <div style={{ fontWeight: 700 }}>
                          {formatDate(selectedContract.ngay_tra_phong_du_kien_details || selectedContract.ngay_tra_phong_du_kien)}
                        </div>
                      </div>
                    </div>

                    {selectedContract.bien_ban_tra_phong_trang_thai === 'ChoDoiSoat' ? (
                      /* ALLOW CHANGE OF APPOINTMENT DATE */
                      <div style={{ border: '1px solid var(--gray-200)', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ color: 'var(--gray-800)', marginBottom: '12px' }}>🔄 Thay đổi ngày hẹn trả phòng</h4>
                        <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                          Khách hàng thay đổi kế hoạch? Chọn ngày hẹn mới và lưu lại.
                        </p>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>Ngày hẹn trả phòng mới:</label>
                          <input
                            type="date"
                            className="form-control"
                            value={ngayHenMoi}
                            onChange={(e) => setNgayHenMoi(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                          onClick={handleChangeAppointmentDate}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Đang cập nhật...' : 'Cập nhật ngày hẹn mới'}
                        </button>
                      </div>
                    ) : (
                      /* DISALLOW DATE CHANGE ONCE PROGRESS STARTED */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="alert alert-info" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', color: '#1e40af', fontSize: '13px' }}>
                          Biên bản trả phòng đang tiến hành đối soát, khấu trừ hoặc thanh lý (trạng thái: <strong>{getStatusText(selectedContract.bien_ban_tra_phong_trang_thai)}</strong>). Không thể thay đổi ngày hẹn trả phòng tại thời điểm này.
                        </div>
                        
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                          onClick={() => navigate(`/tra-phong/${selectedContract.bien_ban_tra_phong_id}`)}
                        >
                          Xem chi tiết quy trình trả phòng ➔
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* NEW CHECKOUT REGISTRATION FLOW */
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '20px' }}>
                      Khách hàng có nhu cầu kết thúc hợp đồng thuê và trả phòng? Lên lịch hẹn ngày khách trả phòng để khởi tạo biên bản trả phòng.
                    </p>
                    
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                      <label className="form-label" style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                        Ngày trả phòng dự kiến:
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={ngayTraPhongDuKien}
                        onChange={(e) => setNgayTraPhongDuKien(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)', display: 'block', marginTop: '6px' }}>
                        Chỉ cho phép chọn ngày hôm nay hoặc các ngày trong tương lai.
                      </span>
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                      onClick={handleRegisterCheckout}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Đang đăng ký...' : '🚀 Xác nhận đăng ký trả phòng'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
