import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import TraCuuPhong from '../../components/shared/TraCuuPhong'
import { createNhuCauThue, updatePhongDuKien } from '../../api/nhuCauThue.api'
import { FieldError } from '../../components/shared/FieldError'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function TiepNhanYeuCau() {
  const navigate = useNavigate()

  // Form states
  const [customer, setCustomer] = useState({
    ho_ten: '',
    so_dien_thoai: '',
    email: '',
    gioi_tinh: 'Nam',
    quoc_tich: 'Việt Nam',
    so_cmnd_cccd: ''
  })

  const [criteria, setCriteria] = useState({
    so_nguoi: 1,
    khu_vuc_yeu_cau: '',
    loai_phong_yeu_cau: 'Don',
    muc_gia_toi_da: '',
    thoi_gian_vao_o_du_kien: '',
    thoi_han_thue_du_kien: 6,
    ghi_chu_yeu_cau: '',
    phuong_thuc_thong_bao: 'Email'
  })

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  
  // Điều phối luồng (Wizard states)
  // 'input': đang điền form
  // 'show_modal': hiển thị modal cảnh báo khách hàng tồn tại
  // 'select_room': đã tạo xong yêu cầu, đang chọn phòng dự kiến
  const [step, setStep] = useState('input')
  const [createdRequest, setCreatedRequest] = useState(null) // { id, khach_hang_id, khach_hang_da_ton_tai }
  const [selectedRoom, setSelectedRoom] = useState(null)

  const handleInputChange = (e, section) => {
    const { id, value } = e.target
    if (section === 'customer') {
      setCustomer({ ...customer, [id]: value })
      if (fieldErrors[id]) {
        setFieldErrors(prev => ({ ...prev, [id]: undefined }))
      }
    } else {
      setCriteria({ ...criteria, [id]: value })
      if (fieldErrors[id]) {
        setFieldErrors(prev => ({ ...prev, [id]: undefined }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setToast(null)
    setFieldErrors({})

    const payload = {
      khach_hang: {
        ...customer,
        email: customer.email || undefined,
        so_cmnd_cccd: customer.so_cmnd_cccd || undefined
      },
      so_nguoi: Number(criteria.so_nguoi),
      gioi_tinh_yeu_cau: customer.gioi_tinh, // Mặc định yêu cầu phòng nam/nữ trùng giới tính khách
      khu_vuc_yeu_cau: criteria.khu_vuc_yeu_cau || undefined,
      loai_phong_yeu_cau: criteria.loai_phong_yeu_cau,
      muc_gia_toi_da: criteria.muc_gia_toi_da ? Number(criteria.muc_gia_toi_da) : undefined,
      thoi_gian_vao_o_du_kien: criteria.thoi_gian_vao_o_du_kien || undefined,
      thoi_han_thue_du_kien: Number(criteria.thoi_han_thue_du_kien),
      ghi_chu_yeu_cau: criteria.ghi_chu_yeu_cau || undefined,
      phuong_thuc_thong_bao: criteria.phuong_thuc_thong_bao
    }

    try {
      const res = await createNhuCauThue(payload)
      if (res.success) {
        setCreatedRequest(res.data)
        
        if (res.data.khach_hang_da_ton_tai) {
          // Hiện modal xác nhận đúng người
          setStep('show_modal')
        } else {
          // Sang bước chọn phòng
          setToast({ type: 'success', message: 'Đăng ký thông tin khách mới thành công!' })
          setStep('select_room')
        }
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Không thể đăng ký thông tin khách mới.' })
      }
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        setToast({ type: 'warning', message: 'Vui lòng kiểm tra lại các thông tin chưa hợp lệ.' })
      } else {
        setToast({ type: 'danger', message: err.message || 'Lỗi hệ thống.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCustomer = () => {
    setStep('select_room')
    setToast({ type: 'success', message: 'Đã xác nhận và liên kết hồ sơ khách hàng!' })
  }

  const handleRoomSelected = async (room) => {
    if (!createdRequest) return
    
    setSelectedRoom(room)
    try {
      const res = await updatePhongDuKien(createdRequest.id, room.id)
      if (res.success) {
        setToast({ type: 'success', message: `Đã liên kết phòng dự kiến ${room.ma_phong}!` })
      } else {
        setToast({ type: 'danger', message: res.error?.message || 'Lỗi liên kết phòng.' })
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Lỗi kết nối.' })
    }
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Đăng ký khách mới" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Đăng ký khách mới</h1>
            <p className="page-subtitle">Đăng ký thông tin khách hàng và tiêu chí tìm phòng để hệ thống hỗ trợ lọc phòng phù hợp.</p>
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

          {/* BƯỚC 1: NHẬP THÔNG TIN */}
          {step === 'input' && (
            <form onSubmit={handleSubmit} className="card">
              <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', color: 'var(--gray-800)' }}>
                👤 1. Thông tin khách hàng
              </h3>
              
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="ho_ten">Họ và tên *</label>
                  <input 
                    type="text" 
                    id="ho_ten" 
                    className={`input ${fieldErrors.ho_ten ? 'input-error' : ''}`}
                    placeholder="Nhập họ và tên khách hàng" 
                    required 
                    value={customer.ho_ten}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  />
                  <FieldError error={fieldErrors.ho_ten} />
                </div>
                
                <div className="form-group">
                  <label htmlFor="so_dien_thoai">Số điện thoại *</label>
                  <input 
                    type="text" 
                    id="so_dien_thoai" 
                    className={`input ${fieldErrors.so_dien_thoai ? 'input-error' : ''}`}
                    placeholder="Nhập số điện thoại" 
                    required 
                    value={customer.so_dien_thoai}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  />
                  <FieldError error={fieldErrors.so_dien_thoai} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    className={`input ${fieldErrors.email ? 'input-error' : ''}`}
                    placeholder="nhap-email@gmail.com"
                    value={customer.email}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  />
                  <FieldError error={fieldErrors.email} />
                </div>

                <div className="form-group">
                  <label htmlFor="gioi_tinh">Giới tính</label>
                  <select 
                    id="gioi_tinh" 
                    className={`select ${fieldErrors.gioi_tinh ? 'input-error' : ''}`}
                    value={customer.gioi_tinh}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nu">Nữ</option>
                    <option value="Khac">Khác</option>
                  </select>
                  <FieldError error={fieldErrors.gioi_tinh} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="quoc_tich">Quốc tịch</label>
                  <input 
                    type="text" 
                    id="quoc_tich" 
                    className={`input ${fieldErrors.quoc_tich ? 'input-error' : ''}`}
                    value={customer.quoc_tich}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  />
                  <FieldError error={fieldErrors.quoc_tich} />
                </div>

                <div className="form-group">
                  <label htmlFor="so_cmnd_cccd">Số CMND / CCCD</label>
                  <input 
                    type="text" 
                    id="so_cmnd_cccd" 
                    className={`input ${fieldErrors.so_cmnd_cccd ? 'input-error' : ''}`}
                    placeholder="Nhập số CMND/CCCD"
                    value={customer.so_cmnd_cccd}
                    onChange={(e) => handleInputChange(e, 'customer')}
                  />
                  <FieldError error={fieldErrors.so_cmnd_cccd} />
                </div>
              </div>

              <h3 style={{ margin: '30px 0 20px 0', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', color: 'var(--gray-800)' }}>
                🏢 2. Tiêu chí phòng yêu cầu
              </h3>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="so_nguoi">Số người ở *</label>
                  <input 
                    type="number" 
                    id="so_nguoi" 
                    className={`input ${fieldErrors.so_nguoi ? 'input-error' : ''}`}
                    min="1" 
                    required 
                    value={criteria.so_nguoi}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  />
                  <FieldError error={fieldErrors.so_nguoi} />
                </div>

                <div className="form-group">
                  <label htmlFor="loai_phong_yeu_cau">Loại phòng yêu cầu</label>
                  <select 
                    id="loai_phong_yeu_cau" 
                    className={`select ${fieldErrors.loai_phong_yeu_cau ? 'input-error' : ''}`}
                    value={criteria.loai_phong_yeu_cau}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  >
                    <option value="Don">Phòng Đơn</option>
                    <option value="Ghep">Phòng Ghép</option>
                    <option value="NguyenPhong">Nguyên Phòng</option>
                  </select>
                  <FieldError error={fieldErrors.loai_phong_yeu_cau} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="khu_vuc_yeu_cau">Khu vực yêu cầu</label>
                  <input 
                    type="text" 
                    id="khu_vuc_yeu_cau" 
                    className={`input ${fieldErrors.khu_vuc_yeu_cau ? 'input-error' : ''}`}
                    placeholder="Ví dụ: Khu A, tầng thấp..."
                    value={criteria.khu_vuc_yeu_cau}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  />
                  <FieldError error={fieldErrors.khu_vuc_yeu_cau} />
                </div>

                <div className="form-group">
                  <label htmlFor="muc_gia_toi_da">Mức giá tối đa (VNĐ)</label>
                  <input 
                    type="number" 
                    id="muc_gia_toi_da" 
                    className={`input ${fieldErrors.muc_gia_toi_da ? 'input-error' : ''}`}
                    placeholder="Ví dụ: 3000000"
                    value={criteria.muc_gia_toi_da}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  />
                  <FieldError error={fieldErrors.muc_gia_toi_da} />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="thoi_gian_vao_o_du_kien">Thời gian dời vào ở dự kiến</label>
                  <input 
                    type="date" 
                    id="thoi_gian_vao_o_du_kien" 
                    className={`input ${fieldErrors.thoi_gian_vao_o_du_kien ? 'input-error' : ''}`}
                    value={criteria.thoi_gian_vao_o_du_kien}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  />
                  <FieldError error={fieldErrors.thoi_gian_vao_o_du_kien} />
                </div>

                <div className="form-group">
                  <label htmlFor="thoi_han_thue_du_kien">Thời hạn thuê mong muốn (Tháng)</label>
                  <input 
                    type="number" 
                    id="thoi_han_thue_du_kien" 
                    className={`input ${fieldErrors.thoi_han_thue_du_kien ? 'input-error' : ''}`}
                    min="1"
                    value={criteria.thoi_han_thue_du_kien}
                    onChange={(e) => handleInputChange(e, 'criteria')}
                  />
                  <FieldError error={fieldErrors.thoi_han_thue_du_kien} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phuong_thuc_thong_bao">Phương thức nhận thông báo *</label>
                <select 
                  id="phuong_thuc_thong_bao" 
                  className={`select ${fieldErrors.phuong_thuc_thong_bao ? 'input-error' : ''}`}
                  value={criteria.phuong_thuc_thong_bao}
                  onChange={(e) => handleInputChange(e, 'criteria')}
                >
                  <option value="Email">Email</option>
                  <option value="SDT">Số điện thoại (SMS/Zalo)</option>
                </select>
                <FieldError error={fieldErrors.phuong_thuc_thong_bao} />
              </div>

              <div className="form-group">
                <label htmlFor="ghi_chu_yeu_cau">Ghi chú yêu cầu thêm</label>
                <textarea 
                  id="ghi_chu_yeu_cau" 
                  className={`textarea ${fieldErrors.ghi_chu_yeu_cau ? 'input-error' : ''}`}
                  placeholder="Ghi chú thêm về điều hòa, chỗ để xe, giờ giấc tự do..."
                  value={criteria.ghi_chu_yeu_cau}
                  onChange={(e) => handleInputChange(e, 'criteria')}
                ></textarea>
                <FieldError error={fieldErrors.ghi_chu_yeu_cau} />
              </div>

              <div className="page-actions">
                <button 
                  type="button" 
                  className="btn btn-sm" 
                  onClick={() => navigate('/dashboard-sale')}
                  style={{ background: 'var(--gray-300)', color: 'var(--gray-700)' }}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Đang đăng ký...' : 'Đăng ký khách mới ➔'}
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 2: MODAL CẢNH BÁO TRÙNG LẶP KHÁCH HÀNG */}
          {step === 'show_modal' && (
            <div className="modal-backdrop">
              <div className="modal-demo">
                <div className="modal-title">⚠️ Phát hiện khách hàng cũ</div>
                <div className="modal-content">
                  <p style={{ marginBottom: '12px', color: 'var(--gray-700)' }}>
                    Hệ thống tìm thấy một khách hàng đã tồn tại trong cơ sở dữ liệu trùng khớp với số điện thoại <strong>{customer.so_dien_thoai}</strong>.
                  </p>
                  <div style={{ background: 'var(--gray-100)', padding: '12px', borderRadius: '10px', marginBottom: '12px' }}>
                    <strong>Họ tên:</strong> {customer.ho_ten} <br />
                    <strong>Số điện thoại:</strong> {customer.so_dien_thoai}
                  </div>
                  <p style={{ color: 'var(--gray-600)', fontSize: '13px' }}>
                    Đăng ký mới này sẽ tự động liên kết với hồ sơ khách hàng hiện tại để tránh tạo trùng lắp dữ liệu.
                  </p>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleConfirmCustomer}
                  >
                    Xác nhận đúng người & Tiếp tục
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 3: CHỌN PHÒNG DỰ KIẾN */}
          {step === 'select_room' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="card" style={{ marginBottom: '24px', background: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                <h3 style={{ marginBottom: '8px' }}>🎉 Tạo yêu cầu thành công!</h3>
                <p>Hệ thống đã ghi nhận yêu cầu thuê của khách hàng <strong>{customer.ho_ten}</strong>.</p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>Mã yêu cầu: <code>{createdRequest.id}</code></p>
              </div>

              <div className="page-header" style={{ marginTop: '32px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700 }}>🔍 Chọn phòng dự kiến cho khách</h2>
                <p className="page-subtitle">Lọc phòng trống đáp ứng các tiêu chí của khách. Nhấp "Chọn" phòng để liên kết.</p>
              </div>

              <TraCuuPhong 
                mode="select" 
                onSelectPhong={handleRoomSelected}
                selectedPhongId={selectedRoom?.id}
              />

              <div className="page-actions" style={{ marginTop: '32px' }}>
                <button 
                  className="btn" 
                  onClick={() => navigate('/dashboard-sale')}
                  style={{ background: 'var(--gray-300)', color: 'var(--gray-700)' }}
                >
                  Quay lại Dashboard
                </button>
                
                <button 
                  className="btn btn-primary"
                  disabled={!selectedRoom}
                  onClick={() => navigate(`/dat-lich-xem-phong/${createdRequest.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Đặt lịch xem phòng ➔
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
