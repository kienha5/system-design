import { useState, useEffect } from 'react'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import { useAuth } from '../../context/AuthContext'
import { getPhieuChoXuLy, nopChungTu, xacNhanPhieu, getPhieuDatCocById } from '../../api/phieuDatCoc.api'
import { supabase } from '../../lib/supabaseClient'
import Toast from '../../components/shared/Toast'

// Real-time Countdown Timer Component
function CountdownTimer({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(endTime) - new Date()
      if (difference <= 0) {
        setTimeLeft('Đã hết hạn')
        setIsExpired(true)
        if (onExpire) onExpire()
        return
      }

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      const formattedHours = String(hours).padStart(2, '0')
      const formattedMinutes = String(minutes).padStart(2, '0')
      const formattedSeconds = String(seconds).padStart(2, '0')

      setTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`)
    }

    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  return (
    <span style={{ 
      fontFamily: 'monospace', 
      fontWeight: 'bold', 
      color: isExpired ? 'var(--danger)' : 'var(--warning-dark, #b45309)',
      background: isExpired ? '#fee2e2' : '#fef3c7',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '13px'
    }}>
      ⏱️ {timeLeft}
    </span>
  )
}

export default function GhiNhanDatCoc() {
  const { user } = useAuth()
  const [slips, setSlips] = useState([])
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Sale upload states
  const [paymentMethod, setPaymentMethod] = useState('ChuyenKhoan')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Toast notification state
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const role = user?.vai_tro?.toLowerCase()
  const isSale = role === 'sale'
  const isQuanLy = role === 'quanly' || role === 'quản lý'

  const fetchSlips = async () => {
    setLoading(true)
    try {
      const res = await getPhieuChoXuLy()
      if (res.success) {
        setSlips(res.data)
        // If a slip was selected, refresh its data too
        if (selectedSlip) {
          const updated = res.data.find(s => s.id === selectedSlip.id)
          if (updated) {
            setSelectedSlip(updated)
          } else {
            setSelectedSlip(null)
          }
        }
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Không thể lấy danh sách phiếu đặt cọc.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlips()
  }, [])

  const handleSelectSlip = async (slip) => {
    try {
      const res = await getPhieuDatCocById(slip.id)
      if (res.success) {
        setSelectedSlip(res.data)
        // Reset upload states
        setSelectedFile(null)
        setPreviewUrl(null)
        setPaymentMethod('ChuyenKhoan')
      }
    } catch (err) {
      console.error(err)
      showToast('Không thể lấy chi tiết phiếu đặt cọc.', 'danger')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUploadAndSubmit = async () => {
    if (!selectedFile) {
      showToast('Vui lòng chọn hình ảnh minh chứng chuyển khoản.', 'warning')
      return
    }

    setActionLoading(true)
    try {
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `pdc_${selectedSlip.id}_${Date.now()}.${fileExt}`
      const filePath = `chung-tu/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chung-tu')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chung-tu')
        .getPublicUrl(filePath)

      // 3. Save to backend database
      const res = await nopChungTu(selectedSlip.id, {
        chung_tu_url: publicUrl,
        phuong_thuc_thanh_toan: paymentMethod
      })

      if (res.success) {
        showToast('Nộp chứng từ đặt cọc thành công! Đang chờ Quản lý duyệt.')
        setSelectedFile(null)
        setPreviewUrl(null)
        await fetchSlips()
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Lỗi trong quá trình nộp chứng từ.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      const res = await xacNhanPhieu(selectedSlip.id, true)
      if (res.success) {
        showToast('Phê duyệt thành công! Trạng thái phòng/giường đã được cập nhật thành Đã Đặt Cọc.')
        setSelectedSlip(null)
        await fetchSlips()
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Phê duyệt thất bại.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối chứng từ này không?')) return
    
    setActionLoading(true)
    try {
      const res = await xacNhanPhieu(selectedSlip.id, false)
      if (res.success) {
        showToast('Đã từ chối chứng từ thành công. Yêu cầu đã được hoàn trả lại cho Sale.', 'warning')
        setSelectedSlip(null)
        await fetchSlips()
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Thao tác thất bại.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title={isQuanLy ? "Quản lý trạng thái phòng" : "Xác nhận thanh toán cọc"} />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">{isQuanLy ? "Quản lý trạng thái phòng" : "Xác nhận thanh toán cọc"}</h1>
            <p className="page-subtitle">
              {isQuanLy 
                ? "Danh sách các phiếu giữ phòng đang chờ quản lý phê duyệt chứng từ giao dịch để kích hoạt trạng thái giữ phòng."
                : "Tra cứu các phiếu giữ phòng mới lập, tải lên hóa đơn/biên lai chuyển khoản trước khi hết hạn 24 giờ."
              }
            </p>
          </div>

          <div className="grid-2">
            {/* Left Column: Pending Slips List */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: 'var(--gray-800)' }}>Phiếu đặt cọc cần xử lý</h3>
                <button 
                  className="btn btn-sm" 
                  onClick={fetchSlips} 
                  disabled={loading}
                  style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}
                >
                  🔄 Làm mới
                </button>
              </div>

              {loading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-500)' }}>
                  Đang tải danh sách phiếu cọc...
                </div>
              ) : slips.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
                  📭 Không có phiếu đặt cọc nào đang chờ thanh toán.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                  {slips.map((slip) => {
                    const isSelected = selectedSlip && selectedSlip.id === slip.id
                    const hasSlipUploaded = !!slip.chung_tu_url
                    
                    return (
                      <div 
                        key={slip.id}
                        onClick={() => handleSelectSlip(slip)}
                        className={`card`}
                        style={{ 
                          padding: '16px',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--white)',
                          cursor: 'pointer',
                          borderRadius: '12px',
                          transition: 'all 0.2s',
                          transform: isSelected ? 'scale(1.01)' : 'none',
                          boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-xs)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>
                            🔖 {slip.ma_phieu_coc}
                          </span>
                          <CountdownTimer endTime={slip.han_thanh_toan} onExpire={() => {}} />
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--gray-600)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                          <div><strong>Khách hàng:</strong> {slip.khach_hang_ho_ten} ({slip.khach_hang_so_dien_thoai})</div>
                          <div><strong>Vị trí:</strong> Phòng {slip.ma_phong} {slip.giuong_id ? `(Giường ${slip.ma_giuong})` : "(Nguyên phòng)"}</div>
                          <div><strong>Tiền cọc:</strong> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatVND(slip.so_tien_coc)}</span></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span className={`badge ${hasSlipUploaded ? 'status-pending' : 'status-maintain'}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                            {hasSlipUploaded ? '⚡ Đã nộp chứng từ' : '⏳ Chờ thanh toán'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            Lập: {new Date(slip.ngay_dat_coc).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Detailed View & Actions */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: selectedSlip ? 'flex-start' : 'center', minHeight: '400px' }}>
              {!selectedSlip ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
                  <h3>Thông tin chi tiết</h3>
                  <p style={{ fontSize: '14px', maxWidth: '300px', margin: '8px auto 0 auto' }}>
                    Chọn một phiếu đặt cọc bên danh sách trái để xem thông tin chi tiết, hình ảnh minh chứng và xử lý nghiệp vụ tương ứng.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--gray-800)' }}>
                        Chi tiết {selectedSlip.ma_phieu_coc}
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--gray-500)' }}>
                        ID: {selectedSlip.id}
                      </p>
                    </div>
                    <span className="badge status-pending" style={{ fontSize: '12px', padding: '6px 12px' }}>
                      {selectedSlip.chung_tu_url ? 'Chờ Quản lý duyệt' : 'Chờ nộp tiền'}
                    </span>
                  </div>

                  {/* Customer & Room Info Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '8px', borderBottom: '1px dashed var(--gray-200)', paddingBottom: '4px' }}>
                        👤 Thông tin khách đặt cọc
                      </h4>
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)', width: '120px' }}>Họ và tên:</td>
                            <td style={{ padding: '4px 0', fontWeight: 600, color: 'var(--gray-800)' }}>{selectedSlip.khach_hang_ho_ten}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Số điện thoại:</td>
                            <td style={{ padding: '4px 0', fontWeight: 600, color: 'var(--gray-800)' }}>{selectedSlip.khach_hang_so_dien_thoai}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Email:</td>
                            <td style={{ padding: '4px 0', color: 'var(--gray-800)' }}>{selectedSlip.khach_hang_email || 'Chưa cập nhật'}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Quốc tịch:</td>
                            <td style={{ padding: '4px 0', color: 'var(--gray-800)' }}>{selectedSlip.khach_hang_quoc_tich || 'Việt Nam'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 style={{ color: 'var(--primary)', marginBottom: '8px', borderBottom: '1px dashed var(--gray-200)', paddingBottom: '4px' }}>
                        🏢 Thông tin phòng & đặt giữ chỗ
                      </h4>
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)', width: '120px' }}>Phòng đăng ký:</td>
                            <td style={{ padding: '4px 0', fontWeight: 600, color: 'var(--gray-800)' }}>Phòng {selectedSlip.ma_phong}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Loại hình thuê:</td>
                            <td style={{ padding: '4px 0', color: 'var(--gray-800)' }}>
                              {selectedSlip.loai_phong === 'NguyenPhong' ? 'Nguyên phòng (Ký túc xá)' : 'Thuê giường đơn/ghép'}
                            </td>
                          </tr>
                          {selectedSlip.giuong_id && (
                            <tr>
                              <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Mã giường:</td>
                              <td style={{ padding: '4px 0', fontWeight: 600, color: 'var(--primary)' }}>Giường {selectedSlip.ma_giuong}</td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ padding: '4px 0', color: 'var(--gray-500)' }}>Hạn thanh toán cọc:</td>
                            <td style={{ padding: '4px 0', color: 'var(--danger)', fontWeight: 600 }}>
                              {new Date(selectedSlip.han_thanh_toan).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                          <tr style={{ borderTop: '1px solid var(--gray-200)' }}>
                            <td style={{ padding: '12px 0 4px 0', color: 'var(--gray-800)', fontWeight: 700, fontSize: '15px' }}>Tiền cọc giữ chỗ:</td>
                            <td style={{ padding: '12px 0 4px 0', fontWeight: 800, color: 'var(--success)', fontSize: '18px' }}>
                              {formatVND(selectedSlip.so_tien_coc)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="2" style={{ fontSize: '11px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                              (Mức tiền cọc tương đương với 2 tháng tiền thuê giường: {formatVND(selectedSlip.phong_gia_thue)}/giường/tháng)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTION SECTION FOR SALE */}
                  {isSale && (
                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
                      <h4 style={{ color: 'var(--gray-800)', marginBottom: '12px' }}>💰 Quy trình cập nhật thanh toán cọc</h4>
                      
                      {!selectedSlip.chung_tu_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label className="form-label">Phương thức thanh toán:</label>
                            <select 
                              className="select" 
                              value={paymentMethod} 
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="ChuyenKhoan">Chuyển khoản ngân hàng (Khuyên dùng)</option>
                              <option value="TienMat">Thanh toán tiền mặt trực tiếp</option>
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Minh chứng chuyển khoản (Ảnh biên lai/bill):</label>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileChange}
                              style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}
                            />
                          </div>

                          {previewUrl && (
                            <div style={{ marginTop: '8px', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden', maxHeight: '250px' }}>
                              <img 
                                src={previewUrl} 
                                alt="Xem trước biên lai" 
                                style={{ width: '100%', height: 'auto', maxHeight: '240px', objectFit: 'contain', background: '#f8fafc' }} 
                              />
                            </div>
                          )}

                          <button 
                            className="btn btn-primary" 
                            onClick={handleUploadAndSubmit}
                            disabled={actionLoading || !selectedFile}
                            style={{ marginTop: '8px', width: '100%' }}
                          >
                            {actionLoading ? 'Đang tải lên & nộp chứng từ...' : '📤 Tải lên & Gửi xác nhận'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning-dark, #b45309)', fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>
                            <span>⏳</span> Đã nộp chứng từ thanh toán ({selectedSlip.phuong_thuc_thanh_toan === 'ChuyenKhoan' ? 'Chuyển khoản' : 'Tiền mặt'}). Đang chờ Quản lý duyệt.
                          </div>
                          
                          <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in' }} onClick={() => window.open(selectedSlip.chung_tu_url, '_blank')}>
                            <img 
                              src={selectedSlip.chung_tu_url} 
                              alt="Biên lai thanh toán" 
                              style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain', background: '#ffffff' }}
                            />
                            <div style={{ fontSize: '11px', color: 'var(--gray-400)', textAlign: 'center', padding: '4px 0', background: '#f1f5f9' }}>
                              Nhấp chuột để phóng to ảnh chứng từ ↗
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTION SECTION FOR MANAGER */}
                  {isQuanLy && (
                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
                      <h4 style={{ color: 'var(--gray-800)', marginBottom: '12px' }}>⚖️ Nghiệp vụ Phê duyệt chứng từ đặt cọc</h4>
                      
                      {!selectedSlip.chung_tu_url ? (
                        <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                          ⚠️ Nhân viên Sale chưa tải lên minh chứng chuyển khoản của khách hàng này. Đang chờ cập nhật.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                              <strong>Phương thức giao dịch:</strong> {selectedSlip.phuong_thuc_thanh_toan === 'ChuyenKhoan' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt trực tiếp'}
                            </div>
                            <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
                              <a href={selectedSlip.chung_tu_url} target="_blank" rel="noreferrer">
                                <img 
                                  src={selectedSlip.chung_tu_url} 
                                  alt="Minh chứng giao dịch" 
                                  style={{ width: '100%', height: 'auto', maxHeight: '260px', objectFit: 'contain', background: '#ffffff' }} 
                                />
                              </a>
                              <div style={{ fontSize: '11px', color: 'var(--gray-400)', textAlign: 'center', padding: '6px 0', background: '#f1f5f9' }}>
                                Xem ảnh gốc: <a href={selectedSlip.chung_tu_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Nhấp vào đây để xem ảnh kích thước lớn ↗</a>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button 
                              className="btn btn-outline" 
                              onClick={handleReject}
                              disabled={actionLoading}
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'transparent' }}
                            >
                              ❌ Từ chối chứng từ
                            </button>
                            <button 
                              className="btn btn-primary" 
                              onClick={handleApprove}
                              disabled={actionLoading}
                              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              {actionLoading ? 'Đang phê duyệt...' : '✅ Phê duyệt & Khóa chỗ'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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
