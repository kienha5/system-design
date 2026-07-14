import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import TraCuuPhong from '../../components/shared/TraCuuPhong'
import { getNhuCauThue, searchNhuCauThueByPhone } from '../../api/nhuCauThue.api'
import { createPhieuDatCoc } from '../../api/phieuDatCoc.api'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function LapPhieuDatCoc() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [activeStep, setActiveStep] = useState(1) // 1: Tìm yêu cầu, 2: Chọn phòng/giường, 3: Xác nhận & Tạo phiếu, 4: Thành công
  
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  
  // States dữ liệu được chọn
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedBed, setSelectedBed] = useState(null)
  const [soGiuongThue, setSoGiuongThue] = useState(1)
  const [soTienCoc, setSoTienCoc] = useState(0)

  // State kết quả tạo phiếu cọc
  const [createdDeposit, setCreatedDeposit] = useState(null)
  const [countdownText, setCountdownText] = useState('')

  // Tự động load nếu có nhuCauThueId trên URL query string
  useEffect(() => {
    const queryId = searchParams.get('nhuCauThueId')
    if (queryId) {
      setSearchQuery(queryId)
      handleLoadRequest(queryId)
    }
  }, [searchParams])

  const handleLoadRequest = async (id) => {
    setLoadingSearch(true)
    setToast(null)
    try {
      const res = await getNhuCauThue(id)
      if (res.success) {
        setSelectedRequest(res.data)
        setSearchResults([])
        
        // Nếu yêu cầu đã có phòng dự kiến, tự động điền phòng dự kiến
        if (res.data.phong_du_kien) {
          const room = res.data.phong_du_kien
          setSelectedRoom(room)
          
          // Tính toán tiền cọc dự kiến
          const bedsCount = room.loai_phong === 'NguyenPhong' ? room.suc_chua_toi_da : 1
          setSoGiuongThue(bedsCount)
          setSoTienCoc(room.gia_thue_mot_giuong * 2 * bedsCount)
        }
        
        setToast({ type: 'success', message: 'Đã tìm thấy thông tin yêu cầu thuê!' })
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Không tìm thấy mã yêu cầu này.' })
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Lỗi tải dữ liệu.' })
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    const query = searchQuery.trim()
    
    // Kiểm tra nếu là UUID (độ dài 36 ký tự và có dash)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)

    if (isUUID) {
      handleLoadRequest(query)
    } else {
      // Tìm kiếm bằng số điện thoại
      setLoadingSearch(true)
      setToast(null)
      try {
        const res = await searchNhuCauThueByPhone(query)
        if (res.success) {
          if (res.data.length === 0) {
            setToast({ type: 'warning', message: 'Không tìm thấy yêu cầu thuê nào gắn với SĐT này.' })
            setSearchResults([])
          } else if (res.data.length === 1) {
            // Nếu chỉ có 1 yêu cầu, tự động tải
            handleLoadRequest(res.data[0].id)
          } else {
            // Nếu có nhiều hơn 1, hiển thị danh sách để chọn
            setSearchResults(res.data)
            setSelectedRequest(null)
            setToast({ type: 'warning', message: 'Tìm thấy nhiều yêu cầu thuê. Vui lòng chọn một yêu cầu cụ thể.' })
          }
        } else {
          setToast({ type: 'danger', message: res.error?.message || 'Lỗi tìm kiếm.' })
        }
      } catch (err) {
        setToast({ type: 'danger', message: err.message || 'Lỗi kết nối máy chủ.' })
      } finally {
        setLoadingSearch(false)
      }
    }
  }

  // Chọn phòng từ TraCuuPhong
  const handleRoomSelected = (room) => {
    setSelectedRoom(room)
    setSelectedBed(null) // Reset giường khi chọn phòng mới

    const bedsCount = room.loai_phong === 'NguyenPhong' ? room.suc_chua_toi_da : 1
    setSoGiuongThue(bedsCount)
    setSoTienCoc(room.gia_thue_mot_giuong * 2 * bedsCount)
  }

  // Chọn giường từ TraCuuPhong
  const handleBedSelected = (bed, room) => {
    setSelectedBed(bed)
    setSelectedRoom(room)
    
    setSoGiuongThue(1)
    setSoTienCoc(room.gia_thue_mot_giuong * 2 * 1)
  }

  const handleCreateDeposit = async () => {
    if (!selectedRequest || !selectedRoom) return

    setLoadingSearch(true)
    setToast(null)

    const payload = {
      nhu_cau_thue_id: selectedRequest.id,
      khach_hang_id: selectedRequest.khach_hang.id,
      phong_id: selectedRoom.id,
      giuong_id: selectedBed ? selectedBed.id : null,
      so_giuong_thue: soGiuongThue,
      chi_nhanh_id: selectedRoom.chi_nhanh?.id || selectedRequest.chi_nhanh_id || selectedRoom.chi_nhanh_id
    }

    try {
      const res = await createPhieuDatCoc(payload)
      if (res.success) {
        setCreatedDeposit(res.data)
        setToast({ type: 'success', message: 'Đã lập phiếu đặt cọc giữ chỗ thành công!' })
        setActiveStep(4)
        
        // Khởi chạy đếm ngược 24 giờ
        startCountdown(res.data.han_thanh_toan)
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Không thể tạo phiếu đặt cọc.' })
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setToast({ type: 'warning', message: errors._general || 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.' })
      } else {
        setToast({ type: 'danger', message: err.message || 'Lỗi tạo phiếu đặt cọc.' })
      }
    } finally {
      setLoadingSearch(false)
    }
  }

  // Chạy đồng hồ đếm ngược 24h
  const startCountdown = (expiryTimeStr) => {
    const expiryTime = new Date(expiryTimeStr).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diff = expiryTime - now

      if (diff <= 0) {
        setCountdownText('ĐÃ HẾT HẠN THANH TOÁN')
        clearInterval(timerInterval)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setCountdownText(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  const translateRoomType = (type) => {
    if (type === 'Don') return 'Phòng Đơn'
    if (type === 'Ghep') return 'Phòng Ghép'
    if (type === 'NguyenPhong') return 'Nguyên Phòng'
    return type
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Giữ phòng" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Giữ phòng</h1>
            <p className="page-subtitle">Thực hiện giữ chỗ phòng và giường cho khách hàng bằng cách lập phiếu giữ phòng thời hạn thanh toán 24h.</p>
          </div>

          {toast && (
            <div className="toast-container">
              <Toast 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast(null)} 
              />
            </div>
          )}

          {/* THANH TIẾN TRÌNH WIZARD */}
          {activeStep < 4 && (
            <div className="wizard-steps">
              <div className={`wizard-step ${activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <span>Tìm khách đăng ký</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: 'var(--gray-200)', margin: '0 16px' }}></div>
              <div className={`wizard-step ${activeStep === 2 ? 'active' : activeStep > 2 ? 'completed' : ''}`}>
                <div className="step-number">2</div>
                <span>Chọn phòng & giường</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: 'var(--gray-200)', margin: '0 16px' }}></div>
              <div className={`wizard-step ${activeStep === 3 ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <span>Xác nhận & Giữ phòng</span>
              </div>
            </div>
          )}

          {/* =========================================================================
              WIZARD BƯỚC 1: TÌM YÊU CẦU THUÊ
              ========================================================================= */}
          {activeStep === 1 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)' }}>🔍 Nhập mã đăng ký hoặc SĐT khách hàng</h3>
                
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Mã đăng ký hoặc SĐT khách"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={loadingSearch}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loadingSearch}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {loadingSearch ? 'Đang tìm...' : 'Tìm kiếm'}
                  </button>
                </form>
              </div>

              {/* Danh sách kết quả nếu có nhiều SĐT trùng khớp */}
              {searchResults.length > 0 && (
                <div className="card" style={{ marginBottom: '24px', animation: 'fadeIn 0.3s ease' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--gray-800)' }}>Kết quả tìm kiếm liên quan:</h4>
                  <table className="room-table">
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th>Mã yêu cầu</th>
                        <th>Loại yêu cầu</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((res) => (
                        <tr key={res.id}>
                          <td><strong>{res.ho_ten}</strong></td>
                          <td>{res.so_dien_thoai}</td>
                          <td><code>{res.id.substring(0, 8)}...</code></td>
                          <td>{translateRoomType(res.loai_phong_yeu_cau)}</td>
                          <td>{res.trang_thai}</td>
                          <td>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleLoadRequest(res.id)}
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

              {/* Chi tiết yêu cầu được chọn */}
              {selectedRequest && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                    👤 Khách hàng & Yêu cầu tương ứng
                  </h3>
                  
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Khách thuê</label>
                      <div className="detail-value">
                        <strong>{selectedRequest.khach_hang.ho_ten}</strong> <br />
                        <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                          SĐT: {selectedRequest.khach_hang.so_dien_thoai} | Email: {selectedRequest.khach_hang.email || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <label>Giới tính & Quốc tịch</label>
                      <div className="detail-value">
                        {selectedRequest.khach_hang.gioi_tinh || 'N/A'} | {selectedRequest.khach_hang.quoc_tich || 'Việt Nam'}
                      </div>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ marginTop: '12px' }}>
                    <div className="detail-item">
                      <label>Trạng thái yêu cầu</label>
                      <div className="detail-value">
                        <span className="badge status-pending">{selectedRequest.trang_thai}</span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <label>Phòng dự kiến liên kết trước đó</label>
                      <div className="detail-value">
                        {selectedRequest.phong_du_kien ? (
                          <strong>🚪 Phòng {selectedRequest.phong_du_kien.ma_phong} ({translateRoomType(selectedRequest.phong_du_kien.loai_phong)})</strong>
                        ) : (
                          <span style={{ color: 'var(--gray-500)' }}>Chưa có liên kết</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="page-actions" style={{ marginTop: '24px' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveStep(2)}
                      style={{ padding: '12px 24px' }}
                    >
                      Tiếp tục chọn phòng & giường ➔
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              WIZARD BƯỚC 2: CHỌN PHÒNG & GIƯỜNG GIỮ CHỖ
              ========================================================================= */}
          {activeStep === 2 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ marginBottom: '24px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <span>Khách hàng: <strong>{selectedRequest.khach_hang.ho_ten}</strong> | Tiêu chí: {translateRoomType(selectedRequest.loai_phong_yeu_cau)}</span>
              </div>

              <div className="page-header">
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>🔍 Chọn phòng và giường để lập cọc</h2>
                <p className="page-subtitle">Nhấp chọn phòng trống. Hệ thống sẽ hiển thị giường trống tương ứng để chọn giữ chỗ.</p>
              </div>

              <TraCuuPhong 
                mode="select" 
                onSelectPhong={handleRoomSelected}
                onSelectGiuong={handleBedSelected}
                selectedPhongId={selectedRoom?.id}
                selectedGiuongId={selectedBed?.id}
              />

              {/* Bảng tính toán cọc tạm tính */}
              {selectedRoom && (
                <div className="card" style={{ marginTop: '24px', borderLeft: '4px solid var(--success)', animation: 'fadeIn 0.3s ease' }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--gray-800)' }}>💰 Công thức cọc tạm tính</h3>
                  
                  <div className="detail-grid">
                    <div>
                      <p style={{ color: 'var(--gray-600)' }}>
                        Phòng: <strong>{selectedRoom.ma_phong}</strong> ({translateRoomType(selectedRoom.loai_phong)})
                      </p>
                      {selectedBed && (
                        <p style={{ color: 'var(--gray-600)', marginTop: '4px' }}>
                          Giường: <strong>{selectedBed.ma_giuong}</strong>
                        </p>
                      )}
                      <p style={{ color: 'var(--gray-600)', marginTop: '4px' }}>
                        Đơn giá thuê / Giường: <strong>{formatCurrency(selectedRoom.gia_thue_mot_giuong)}</strong>
                      </p>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                        Công thức: Đơn giá cọc (2 tháng) &times; Số giường
                      </p>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
                        Tổng cọc: {formatCurrency(soTienCoc)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="page-actions" style={{ marginTop: '32px' }}>
                <button 
                  className="btn" 
                  onClick={() => setActiveStep(1)}
                  style={{ background: 'var(--gray-300)', color: 'var(--gray-700)' }}
                >
                  Quay lại bước 1
                </button>
                <button 
                  className="btn btn-primary"
                  disabled={!selectedRoom || (selectedRoom.loai_phong !== 'NguyenPhong' && !selectedBed)}
                  onClick={() => setActiveStep(3)}
                >
                  Xác nhận thông tin cọc ➔
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              WIZARD BƯỚC 3: XÁC NHẬN VÀ TẠO PHIẾU
              ========================================================================= */}
          {activeStep === 3 && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card">
                <h3 style={{ marginBottom: '20px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                  📝 Xác nhận lập phiếu đặt cọc giữ chỗ
                </h3>

                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Khách hàng thuê</label>
                    <div className="detail-value">
                      <strong>{selectedRequest.khach_hang.ho_ten}</strong> <br />
                      SĐT: {selectedRequest.khach_hang.so_dien_thoai}
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Địa điểm & Phòng ở</label>
                    <div className="detail-value">
                      <strong>{selectedRoom.ma_phong}</strong> ({translateRoomType(selectedRoom.loai_phong)}) <br />
                      Giường: {selectedBed ? selectedBed.ma_giuong : 'Thuê nguyên phòng'} <br />
                      Khu vực: {selectedRoom.khu_vuc || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="detail-grid" style={{ marginTop: '16px' }}>
                  <div className="detail-item">
                    <label>Hạn thanh toán cọc giữ chỗ</label>
                    <div className="detail-value" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      24 giờ kể từ thời điểm lập phiếu (Thanh toán để kích hoạt)
                    </div>
                  </div>

                  <div className="detail-item">
                    <label>Tổng số tiền cọc cần đóng</label>
                    <div className="detail-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>
                      {formatCurrency(soTienCoc)}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '14px', borderRadius: '12px', marginTop: '24px', fontSize: '13px' }}>
                  ⚠️ <strong>Lưu ý quan trọng:</strong> Giường và phòng sẽ được khóa ở trạng thái <strong>"Chờ đặt cọc"</strong>. Khách hàng có đúng <strong>24 giờ</strong> để chuyển khoản hoặc đóng tiền mặt. Nếu quá hạn, hệ thống sẽ tự động hủy phiếu cọc và mở khóa phòng trả lại trạng thái trống.
                </div>

                <div className="page-actions" style={{ marginTop: '32px' }}>
                  <button 
                    className="btn" 
                    disabled={loadingSearch}
                    onClick={() => setActiveStep(2)}
                    style={{ background: 'var(--gray-300)', color: 'var(--gray-700)' }}
                  >
                    Quay lại sửa phòng
                  </button>
                  
                  <button 
                    className="btn btn-success"
                    disabled={loadingSearch}
                    onClick={handleCreateDeposit}
                    style={{ padding: '14px 28px', fontSize: '16px' }}
                  >
                    {loadingSearch ? 'Đang tạo phiếu...' : 'Xác nhận tạo phiếu đặt cọc ✓'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              WIZARD BƯỚC 4: TẠO THÀNH CÔNG VÀ ĐẾM NGƯỢC 24H
              ========================================================================= */}
          {activeStep === 4 && createdDeposit && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '640px', margin: 'auto' }}>
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div style={{ fontSize: '64px', color: 'var(--success)', marginBottom: '16px' }}>✓</div>
                
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '8px' }}>
                  Lập phiếu đặt cọc thành công!
                </h2>
                
                <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>
                  Phiếu cọc giữ chỗ đã được lưu trữ trên hệ thống. Giường/phòng đã được khóa để chờ khách đóng cọc.
                </p>

                <div style={{ background: 'var(--gray-50)', padding: '24px', borderRadius: '16px', border: '1px solid var(--gray-200)', textAlign: 'left', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Mã phiếu cọc:</span>
                    <strong>{createdDeposit.ma_phieu_coc}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Khách hàng:</span>
                    <strong>{selectedRequest.khach_hang.ho_ten}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Phòng giữ chỗ:</span>
                    <strong>{selectedRoom.ma_phong} (Giường {selectedBed ? selectedBed.ma_giuong : 'Nguyên phòng'})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Số tiền cọc:</span>
                    <strong style={{ color: 'var(--success)' }}>{formatCurrency(createdDeposit.so_tien_coc)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-200)', paddingTop: '10px', marginTop: '10px' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Hạn thanh toán:</span>
                    <strong style={{ color: 'var(--danger)' }}>
                      {new Date(createdDeposit.han_thanh_toan).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                </div>

                <div className="countdown-box">
                  ⏱️ Thời gian còn lại để thanh toán cọc:
                  <div className="countdown-timer">{countdownText}</div>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/dashboard-sale')}
                  >
                    Quay lại Dashboard
                  </button>
                  <button 
                    className="btn"
                    onClick={() => {
                      // Reset wizard về ban đầu
                      setSelectedRequest(null)
                      setSelectedRoom(null)
                      setSelectedBed(null)
                      setCreatedDeposit(null)
                      setSearchQuery('')
                      setActiveStep(1)
                    }}
                    style={{ background: 'var(--gray-200)', color: 'var(--gray-700)' }}
                  >
                    Lập phiếu cọc mới
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
