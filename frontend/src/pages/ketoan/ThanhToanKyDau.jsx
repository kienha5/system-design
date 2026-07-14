import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { getHopDong } from '../../api/hopDong.api'
import { taoHoaDon, xacNhanThanhToan } from '../../api/hoaDon.api'
import { FieldError } from '../../components/shared/FieldError'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function ThanhToanKyDau() {
  const { hopDongId } = useParams()
  const navigate = useNavigate()

  // Wizard steps: 1: Lập hóa đơn, 2: Xác nhận thu tiền, 3: Thành công
  const [activeStep, setActiveStep] = useState(1)
  
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [contract, setContract] = useState(null)
  const [invoice, setInvoice] = useState(null)

  // Step 1: Input states
  const [tienDien, setTienDien] = useState(0)
  const [tienNuoc, setTienNuoc] = useState(0)
  const [tienDichVuKhac, setTienDichVuKhac] = useState(0)

  // Step 2: Payment states
  const [paymentMethod, setPaymentMethod] = useState('ChuyenKhoan')
  const [fieldErrors, setFieldErrors] = useState({})

  // Toast notifications
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Load contract details on mount
  useEffect(() => {
    const fetchContractDetails = async () => {
      setLoading(true)
      try {
        const res = await getHopDong(hopDongId)
        if (res.success) {
          setContract(res.data)
        }
      } catch (err) {
        console.error(err)
        showToast(err.response?.data?.error?.message || 'Không thể tải thông tin hợp đồng.', 'danger')
      } finally {
        setLoading(false)
      }
    }

    if (hopDongId && hopDongId !== 'select') {
      fetchContractDetails()
    }
  }, [hopDongId])

  // Compute values
  const validMembersCount = contract?.thanh_vien?.filter(m => m.dat_dieu_kien_cu_tru)?.length || 0
  const giaThueGiuong = contract?.gia_thue_theo_giuong || 0
  const tienThue = giaThueGiuong * validMembersCount
  const tongTien = tienThue + Number(tienDien) + Number(tienNuoc) + Number(tienDichVuKhac)

  // Step 1: Create Invoice
  const handleCreateInvoice = async () => {
    if (!contract) return

    setActionLoading(true)
    setFieldErrors({})
    try {
      const payload = {
        hop_dong_id: contract.id,
        tien_dien: Number(tienDien),
        tien_nuoc: Number(tienNuoc),
        tien_dich_vu_khac: Number(tienDichVuKhac)
      }

      const res = await taoHoaDon(payload)
      if (res.success) {
        setInvoice(res.data)
        showToast('Đã lập hóa đơn kỳ thanh toán đầu tiên thành công!')
        setActiveStep(2)
      }
    } catch (err) {
      console.error(err)
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        showToast('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.', 'warning')
      } else {
        showToast(err.response?.data?.error?.message || err.message || 'Lỗi khi lập hóa đơn.', 'danger')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Step 2: Confirm Payment
  const handleConfirmPayment = async () => {
    if (!invoice) return

    setActionLoading(true)
    try {
      const res = await xacNhanThanhToan(invoice.id, paymentMethod)
      if (res.success) {
        showToast('Xác nhận thanh toán thành công!')
        setActiveStep(3)
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi xác nhận thanh toán.', 'danger')
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
        <Header title="Thanh Toán Kỳ Đầu" />
        
        <div className="content">
          {/* Step Progress Indicator */}
          <div className="wizard-steps" style={{ maxWidth: '600px', margin: '0 auto 32px auto' }}>
            <div className={`wizard-step ${activeStep === 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <span>Lập hóa đơn</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 1 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <span>Thu tiền</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 2 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 3 ? 'completed' : ''}`}>
              <div className="step-number">✓</div>
              <span>Hoàn thành</span>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-500)' }}>
              Đang tải dữ liệu hợp đồng...
            </div>
          ) : hopDongId === 'select' ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
              <h3>Nghiệp vụ Thu Tiền Tháng Đầu</h3>
              <p style={{ fontSize: '14px', maxWidth: '400px', margin: '8px auto 0 auto' }}>
                Tiến trình thu tiền tháng đầu được kích hoạt từ flow quản lý sau khi lập hợp đồng. Vui lòng quay lại danh sách hoặc yêu cầu Quản lý dẫn link thực hiện.
              </p>
              <button className="btn btn-outline" onClick={() => navigate('/dashboard-ke-toan')} style={{ marginTop: '20px' }}>
                🏠 Về Dashboard Kế toán
              </button>
            </div>
          ) : !contract ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--danger)' }}>
              Không thể tìm thấy thông tin hợp đồng hoặc xảy ra lỗi kết nối.
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              
              {/* STEP 1: LẬP HÓA ĐƠN */}
              {activeStep === 1 && (
                <div className="grid-2">
                  {/* Left: Contract overview */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px', margin: 0 }}>
                      📋 Thông tin hợp đồng thuê
                    </h3>
                    
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--gray-500)', width: '130px' }}>Mã hợp đồng:</td>
                          <td style={{ padding: '6px 0', fontWeight: 700, color: 'var(--primary)' }}>{contract.ma_hop_dong}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--gray-500)' }}>Người đại diện:</td>
                          <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--gray-800)' }}>{contract.thanh_vien?.[0]?.ho_ten || 'Chưa rõ'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--gray-500)' }}>Vị trí phòng:</td>
                          <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--gray-800)' }}>Phòng {contract.ma_phong} ({contract.loai_phong === 'NguyenPhong' ? 'Nguyên phòng' : 'Giường lẻ'})</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--gray-500)' }}>Số giường thuê:</td>
                          <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--gray-800)' }}>{validMembersCount} giường hợp lệ</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--gray-500)' }}>Đơn giá thuê:</td>
                          <td style={{ padding: '6px 0', color: 'var(--gray-800)' }}>{formatVND(giaThueGiuong)} /giường/tháng</td>
                        </tr>
                        <tr style={{ borderTop: '1px dashed var(--gray-200)' }}>
                          <td style={{ padding: '12px 0 6px 0', color: 'var(--gray-700)', fontWeight: 700 }}>Tổng tiền thuê nhà:</td>
                          <td style={{ padding: '12px 0 6px 0', fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>{formatVND(tienThue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right: Subfees Inputs & Live calculations */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px', margin: 0, marginBottom: '12px' }}>
                        💰 Lập phụ phí & Hóa đơn
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label className="form-label">Tiền điện kỳ đầu (Tạm thu/Không có):</label>
                          <input 
                            type="number" 
                            className={`input ${fieldErrors.tien_dien ? 'input-error' : ''}`}
                            value={tienDien} 
                            min="0"
                            onChange={(e) => {
                              setTienDien(Math.max(0, parseInt(e.target.value) || 0))
                              if (fieldErrors.tien_dien) {
                                setFieldErrors(prev => ({ ...prev, tien_dien: undefined }))
                              }
                            }} 
                          />
                          <FieldError error={fieldErrors.tien_dien} />
                        </div>

                        <div>
                          <label className="form-label">Tiền nước kỳ đầu (Tạm thu/Không có):</label>
                          <input 
                            type="number" 
                            className={`input ${fieldErrors.tien_nuoc ? 'input-error' : ''}`}
                            value={tienNuoc} 
                            min="0"
                            onChange={(e) => {
                              setTienNuoc(Math.max(0, parseInt(e.target.value) || 0))
                              if (fieldErrors.tien_nuoc) {
                                setFieldErrors(prev => ({ ...prev, tien_nuoc: undefined }))
                              }
                            }} 
                          />
                          <FieldError error={fieldErrors.tien_nuoc} />
                        </div>

                        <div>
                          <label className="form-label">Các dịch vụ khác (Gửi xe, phí quản lý...):</label>
                          <input 
                            type="number" 
                            className={`input ${fieldErrors.tien_dich_vu_khac ? 'input-error' : ''}`}
                            value={tienDichVuKhac} 
                            min="0"
                            onChange={(e) => {
                              setTienDichVuKhac(Math.max(0, parseInt(e.target.value) || 0))
                              if (fieldErrors.tien_dich_vu_khac) {
                                setFieldErrors(prev => ({ ...prev, tien_dich_vu_khac: undefined }))
                              }
                            }} 
                          />
                          <FieldError error={fieldErrors.tien_dich_vu_khac} />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '13px', color: 'var(--gray-500)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tiền thuê nhà:</span>
                          <strong>{formatVND(tienThue)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tiền điện:</span>
                          <span>{formatVND(tienDien)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tiền nước:</span>
                          <span>{formatVND(tienNuoc)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Dịch vụ khác:</span>
                          <span>{formatVND(tienDichVuKhac)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: 'var(--gray-800)' }}>
                          <strong style={{ color: 'var(--gray-800)' }}>TỔNG THANH TOÁN:</strong>
                          <strong style={{ color: 'var(--success)', fontSize: '18px' }}>{formatVND(tongTien)}</strong>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary" 
                      onClick={handleCreateInvoice}
                      disabled={actionLoading}
                      style={{ width: '100%' }}
                    >
                      {actionLoading ? 'Đang khởi tạo hóa đơn...' : '🧾 Xuất phiếu thu & Chờ thanh toán'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: THU TIỀN & XÁC NHẬN */}
              {activeStep === 2 && invoice && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px', margin: '0 auto' }}>
                  <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px' }}>
                    <h2 style={{ fontSize: '18px', color: 'var(--gray-800)', margin: 0 }}>Xác nhận thu tiền mặt/chuyển khoản</h2>
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Mã hóa đơn vừa sinh: <strong>{invoice.ma_hoa_don}</strong> | Kỳ thanh toán: <strong>{invoice.ky_thanh_toan}</strong>
                    </p>
                  </div>

                  <div style={{ background: 'var(--primary-light)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--primary)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>TỔNG SỐ TIỀN CẦN THU ĐỦ:</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {formatVND(invoice.tong_tien)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '6px', fontStyle: 'italic' }}>
                      (Bao gồm {formatVND(invoice.tien_thue)} tiền thuê phòng + {formatVND(invoice.tien_dien + invoice.tien_nuoc + invoice.tien_dich_vu_khac)} phụ phí)
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Chọn hình thức thanh toán thực tế:</label>
                    <select 
                      className="select" 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="ChuyenKhoan">Chuyển khoản ngân hàng (Đã đối soát tài khoản)</option>
                      <option value="TienMat">Thu tiền mặt trực tiếp (Đã đếm đủ tiền mặt)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => setActiveStep(1)} 
                      disabled={actionLoading}
                      style={{ flex: 1 }}
                    >
                      ⬅ Quay lại sửa
                    </button>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleConfirmPayment} 
                      disabled={actionLoading}
                      style={{ flex: 2, background: 'var(--success)', borderColor: 'var(--success)' }}
                    >
                      {actionLoading ? 'Đang xác nhận...' : '✅ Xác nhận đã thu đủ'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: THÀNH CÔNG (WITH SPECIFIC EXPLICIT TEXT) */}
              {activeStep === 3 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '550px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#15803d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    ✓
                  </div>
                  
                  <div>
                    <h1 style={{ fontSize: '22px', color: 'var(--gray-800)', margin: 0 }}>Giao dịch thanh toán thành công!</h1>
                    <div 
                      style={{ 
                        marginTop: '16px', 
                        padding: '16px', 
                        background: '#eff6ff', 
                        border: '1px solid #bfdbfe', 
                        borderRadius: '12px', 
                        color: '#1e40af', 
                        fontWeight: 'bold', 
                        fontSize: '15px',
                        lineHeight: '1.5'
                      }}
                    >
                      📢 Thu tiền tháng đầu hoàn tất. Vui lòng thông báo Quản lý tiến hành giao phòng cho khách.
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)', width: '100%', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>Hóa đơn thanh toán:</strong> {invoice?.ma_hoa_don}</div>
                    <div><strong>Hợp đồng liên kết:</strong> {contract.ma_hop_dong}</div>
                    <div><strong>Trạng thái hóa đơn:</strong> <span className="badge status-pending" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 'bold' }}>Đã Thanh Toán</span></div>
                    <div><strong>Hình thức giao dịch:</strong> {paymentMethod === 'ChuyenKhoan' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                    <div><strong>Thời gian xác nhận:</strong> {new Date().toLocaleString('vi-VN')}</div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/dashboard-ke-toan')}
                    style={{ width: '100%' }}
                  >
                    🏠 Về Dashboard Kế toán
                  </button>
                </div>
              )}

            </div>
          )}
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
