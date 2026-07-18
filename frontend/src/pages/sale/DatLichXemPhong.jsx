import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { getNhuCauThue, datLichXem, xacNhanDaXem } from '../../api/nhuCauThue.api'
import { FieldError } from '../../components/shared/FieldError'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function DatLichXemPhong() {
  const { nhuCauThueId } = useParams()
  const navigate = useNavigate()

  const [request, setRequest] = useState(null)
  const [loadingRequest, setLoadingRequest] = useState(true)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // Form states
  const [lichHenXem, setLichHenXem] = useState('')
  const [phuongThucThongBao, setPhuongThucThongBao] = useState('Email')

  // Load rental request details
  const loadRequest = async () => {
    setLoadingRequest(true)
    try {
      const res = await getNhuCauThue(nhuCauThueId)
      if (res.success) {
        setRequest(res.data)
        setPhuongThucThongBao(res.data.phuong_thuc_thong_bao || 'Email')
        
        // Nếu đã có lịch hẹn xem, định dạng và hiển thị lên form
        if (res.data.lich_hen_xem) {
          const date = new Date(res.data.lich_hen_xem)
          // Định dạng thành yyyy-MM-ddThh:mm cho input datetime-local
          const tzoffset = date.getTimezoneOffset() * 60000
          const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16)
          setLichHenXem(localISOTime)
        }
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Không thể lấy thông tin yêu cầu.' })
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Lỗi tải dữ liệu.' })
    } finally {
      setLoadingRequest(false)
    }
  }

  useEffect(() => {
    loadRequest()
  }, [nhuCauThueId])

  const handleSchedule = async (e) => {
    e.preventDefault()
    setFieldErrors({})
    if (!lichHenXem) {
      setToast({ type: 'warning', message: 'Vui lòng chọn thời gian hẹn xem.' })
      return
    }

    const targetDate = new Date(lichHenXem)
    if (targetDate.getTime() <= Date.now()) {
      setToast({ type: 'danger', message: 'Lịch hẹn xem phải là một thời điểm trong tương lai.' })
      return
    }

    setLoadingSubmit(true)
    setToast(null)

    try {
      const res = await datLichXem(nhuCauThueId, {
        lich_hen_xem: targetDate.toISOString(),
        phuong_thuc_thong_bao: phuongThucThongBao
      })

      if (res.success) {
        setToast({ type: 'success', message: 'Đã xếp lịch hẹn xem phòng thành công!' })
        loadRequest() // Reload lại để cập nhật trạng thái
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Lỗi đặt lịch hẹn.' })
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        setToast({ type: 'warning', message: 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.' })
      } else if (err.code === 'LICH_HEN_BI_TRUNG') {
        setToast({ 
          type: 'danger', 
          message: 'Trùng lịch hẹn xem cùng một phòng trong khoảng 1 giờ (trước/sau). Vui lòng chọn giờ khác!' 
        })
      } else {
        setToast({ type: 'danger', message: err.message || 'Lỗi không xác định.' })
      }
    } finally {
      setLoadingSubmit(false)
    }
  }

  const handleConfirmViewed = async () => {
    setLoadingSubmit(true)
    setToast(null)
    try {
      const res = await xacNhanDaXem(nhuCauThueId)
      if (res.success) {
        setToast({ type: 'success', message: 'Đã xác nhận khách hàng xem phòng thành công!' })
        loadRequest() // Reload lại để cập nhật trạng thái sang DaXemPhong
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Lỗi xác nhận.' })
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Lỗi kết nối.' })
    } finally {
      setLoadingSubmit(false)
    }
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

  const translateStatus = (status) => {
    switch (status) {
      case 'MoiTiepNhan': return 'Mới tiếp nhận'
      case 'DaDatLichXem': return 'Đã đặt lịch xem'
      case 'DaXemPhong': return 'Đã xem phòng'
      case 'ChuyenDatCoc': return 'Đã chuyển đặt cọc'
      case 'DaHuy': return 'Đã hủy'
      default: return status
    }
  }

  if (loadingRequest) {
    return (
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Header title="Đăng ký khách mới" />
          <div className="content" style={{ textAlign: 'center', padding: '40px' }}>
            Đang tải thông tin đăng ký...
          </div>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Header title="Đăng ký khách mới" />
          <div className="content" style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)', fontWeight: 600 }}>
            Không tìm thấy thông tin đăng ký phòng này trong hệ thống.
          </div>
        </div>
      </div>
    )
  }

  const { khach_hang, phong_du_kien } = request

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Đăng ký khách mới" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Xếp lịch xem phòng</h1>
            <p className="page-subtitle">Xếp lịch hẹn dẫn khách đi xem phòng thực tế và xác nhận hiện trạng phòng đạt yêu cầu.</p>
          </div>

          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}

          <div className="detail-grid" style={{ marginBottom: '24px' }}>
            {/* THÔNG TIN YÊU CẦU */}
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                📋 Chi tiết yêu cầu
              </h3>
              
              <div className="detail-item">
                <label>Khách hàng</label>
                <div className="detail-value">
                  <strong>{khach_hang.ho_ten}</strong> <br />
                  <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    📞 {khach_hang.so_dien_thoai} | ✉️ {khach_hang.email || 'Không có email'}
                  </span>
                </div>
              </div>

              <div className="grid-2">
                <div className="detail-item">
                  <label>Số người ở</label>
                  <div className="detail-value">{request.so_nguoi} người</div>
                </div>
                <div className="detail-item">
                  <label>Trạng thái yêu cầu</label>
                  <div className="detail-value">
                    <span className={`badge ${request.trang_thai === 'MoiTiepNhan' ? 'status-empty' : request.trang_thai === 'DaDatLichXem' ? 'status-pending' : 'status-renting'}`}>
                      {translateStatus(request.trang_thai)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="detail-item">
                  <label>Mức giá tối đa</label>
                  <div className="detail-value">
                    {request.muc_gia_toi_da ? formatCurrency(request.muc_gia_toi_da) : 'Không yêu cầu'}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Loại phòng</label>
                  <div className="detail-value">{translateRoomType(request.loai_phong_yeu_cau)}</div>
                </div>
              </div>
            </div>

            {/* THÔNG TIN PHÒNG DỰ KIẾN */}
            <div className="card">
              <h3 style={{ marginBottom: '16px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                🏢 Phòng dự kiến đã chọn
              </h3>
              
              {phong_du_kien ? (
                <>
                  <div className="detail-item">
                    <label>Mã phòng liên kết</label>
                    <div className="detail-value" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                      🚪 {phong_du_kien.ma_phong}
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="detail-item">
                      <label>Loại phòng</label>
                      <div className="detail-value">{translateRoomType(phong_du_kien.loai_phong)}</div>
                    </div>
                    <div className="detail-item">
                      <label>Giá thuê giường/tháng</label>
                      <div className="detail-value" style={{ fontWeight: 600 }}>
                        {formatCurrency(phong_du_kien.gia_thue_mot_giuong)}
                      </div>
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="detail-item">
                      <label>Khu vực</label>
                      <div className="detail-value">{phong_du_kien.khu_vuc || 'N/A'}</div>
                    </div>
                    <div className="detail-item">
                      <label>Giới tính quy định</label>
                      <div className="detail-value">{phong_du_kien.gioi_tinh_quy_dinh || 'Không giới hạn'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--gray-500)' }}>
                  <p style={{ marginBottom: '12px' }}>Chưa chọn phòng dự kiến cho yêu cầu thuê này.</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/tiep-nhan-yeu-cau')}
                  >
                    Quay lại chọn phòng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FORM ĐẶT LỊCH HẸN & XÁC NHẬN */}
          {phong_du_kien && (
            <div className="card">
              <h3 style={{ marginBottom: '20px', color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                🗓️ Hẹn lịch và Xác nhận hiện trạng
              </h3>

              <form onSubmit={handleSchedule}>
                <div className="grid-2">
                  <div className="form-group">
                    <label htmlFor="lichHenXem">Lịch hẹn xem phòng (Thời gian tương lai) *</label>
                    <input 
                      type="datetime-local" 
                      id="lichHenXem" 
                      className={`input ${fieldErrors.lich_hen_xem ? 'input-error' : ''}`}
                      required
                      disabled={request.trang_thai === 'DaXemPhong' || request.trang_thai === 'ChuyenDatCoc' || loadingSubmit}
                      value={lichHenXem}
                      onChange={(e) => {
                        setLichHenXem(e.target.value)
                        if (fieldErrors.lich_hen_xem) {
                          setFieldErrors(prev => ({ ...prev, lich_hen_xem: undefined }))
                        }
                      }}
                    />
                    <FieldError error={fieldErrors.lich_hen_xem} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phuongThucThongBao">Phương thức thông báo lịch hẹn *</label>
                    <select 
                      id="phuongThucThongBao" 
                      className={`select ${fieldErrors.phuong_thuc_thong_bao ? 'input-error' : ''}`}
                      disabled={request.trang_thai === 'DaXemPhong' || request.trang_thai === 'ChuyenDatCoc' || loadingSubmit}
                      value={phuongThucThongBao}
                      onChange={(e) => {
                        setPhuongThucThongBao(e.target.value)
                        if (fieldErrors.phuong_thuc_thong_bao) {
                          setFieldErrors(prev => ({ ...prev, phuong_thuc_thong_bao: undefined }))
                        }
                      }}
                    >
                      <option value="Email">Email</option>
                      <option value="SDT">Số điện thoại (SMS/Zalo)</option>
                    </select>
                    <FieldError error={fieldErrors.phuong_thuc_thong_bao} />
                  </div>
                </div>

                {request.trang_thai !== 'DaXemPhong' && request.trang_thai !== 'ChuyenDatCoc' && (
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loadingSubmit}
                    style={{ marginBottom: '24px' }}
                  >
                    {request.lich_hen_xem ? 'Cập nhật lại lịch hẹn xem' : 'Xác nhận Đặt lịch hẹn'}
                  </button>
                )}
              </form>

              {/* BƯỚC XÁC NHẬN ĐÃ XEM PHÒNG (Chỉ hiển thị sau khi đã đặt lịch) */}
              {request.trang_thai === 'DaDatLichXem' && (
                <div 
                  style={{ 
                    borderTop: '2px dashed var(--gray-200)', 
                    paddingTop: '24px', 
                    marginTop: '24px',
                    animation: 'fadeIn 0.3s ease' 
                  }}
                >
                  <h4 style={{ marginBottom: '12px', color: 'var(--gray-800)' }}>
                    ✅ Dẫn khách đi xem thực tế thành công?
                  </h4>
                  <p style={{ color: 'var(--gray-600)', marginBottom: '16px', fontSize: '14px' }}>
                    Sau khi dẫn khách đi xem phòng thực tế và khách đồng ý với hiện trạng phòng, hãy nhấp vào nút dưới đây để xác nhận trạng thái xem phòng hoàn tất.
                  </p>
                  <button 
                    className="btn btn-success"
                    onClick={handleConfirmViewed}
                    disabled={loadingSubmit}
                  >
                    Xác nhận đã xem phòng (Hoàn tất hiện trạng)
                  </button>
                </div>
              )}

              {/* BƯỚC TIẾP THEO: LẬP PHIẾU ĐẶT CỌC */}
              {(request.trang_thai === 'DaXemPhong' || request.trang_thai === 'ChuyenDatCoc') && (
                <div 
                  style={{ 
                    borderTop: '2px dashed var(--gray-200)', 
                    paddingTop: '24px', 
                    marginTop: '24px',
                    animation: 'fadeIn 0.3s ease',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'inline-block', background: 'var(--status-empty-bg)', color: 'var(--status-empty-text)', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, marginBottom: '16px' }}>
                    ✓ ĐÃ HOÀN TẤT XEM PHÒNG & XÁC NHẬN ĐẠT HIỆN TRẠNG
                  </div>
                  <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
                    Khách hàng <strong>{khach_hang.ho_ten}</strong> đã đồng ý thuê. Chuyển sang bước giữ phòng để giữ giường cho khách.
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate(`/lap-phieu-dat-coc?nhuCauThueId=${nhuCauThueId}`)}
                    style={{ padding: '14px 28px', fontSize: '16px' }}
                  >
                    Giữ phòng ngay ➔
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="page-actions" style={{ marginTop: '24px' }}>
            <button 
              className="btn" 
              onClick={() => navigate('/tiep-nhan-yeu-cau')}
              style={{ background: 'var(--gray-300)', color: 'var(--gray-700)' }}
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
