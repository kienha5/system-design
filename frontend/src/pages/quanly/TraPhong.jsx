import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { useAuth } from '../../context/AuthContext'
import {
  getBienBanTraPhong,
  doSoatTaiSan,
  khauTruChiPhi,
  xacNhanKhach,
  getGoiYTyLe
} from '../../api/bienBanTraPhong.api'
import { thanhLyHopDong, searchHopDong } from '../../api/hopDong.api'
import { FieldError } from '../../components/shared/FieldError'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function TraPhong() {
  const { bienBanId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Temporary runtime error alert for debugging
  useEffect(() => {
    const handleError = (event) => {
      alert(`[Antigravity Debug] Runtime Error: ${event.message}\nFile: ${event.filename}\nLine: ${event.lineno}`);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const getStatusText = (status) => {
    switch (status) {
      case 'ChoDoiSoat': return 'Chờ đối soát'
      case 'ChoXacNhan': return 'Chờ xác nhận/Khấu trừ'
      case 'DaThanhLy': return 'Đã thanh lý hoàn tất'
      case 'Tot': return 'Tốt'
      case 'DungDuoc': return 'Dùng được'
      case 'CanChuY': return 'Cần chú ý'
      case 'HuHong': return 'Hư hỏng'
      case 'MatMat': return 'Mất mát'
      default: return status || 'N/A'
    }
  }

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [bienBan, setBienBan] = useState(null)

  // Active step in the UI (1, 2, 3, or 4)
  const [activeStep, setActiveStep] = useState(1)
  const [fieldErrors, setFieldErrors] = useState({})
  const [toast, setToast] = useState(null)

  // Selection view states (when bienBanId === 'select')
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('doisoat')

  // Roles verification
  const role = user?.vai_tro?.toLowerCase()
  const isQuanLy = role === 'quanly' || role === 'quản lý'
  const isKeToan = role === 'ketoan' || role === 'kế toán'

  // Step 1: Asset audit states (UC13)
  const [ngayTraThucTe, setNgayTraThucTe] = useState('')
  const [auditList, setAuditList] = useState([]) // Array of { ten, tinh_trang, ghi_chu, chi_phi_boi_thuong }

  // Step 2: Cost deductions states (UC14)
  const [tyLeHoanCoc, setTyLeHoanCoc] = useState(100)
  const [goiYTyLe, setGoiYTyLeState] = useState(null)
  const [tienThueConNo, setTienThueConNo] = useState(0)
  const [tienDienNuocDichVu, setTienDienNuocDichVu] = useState(0)
  const [chiPhiSuaChuaBoiThuong, setChiPhiSuaChuaBoiThuong] = useState(0)
  const [tienPhatViPham, setTienPhatViPham] = useState(0)

  // Step 3: Client confirmation state (UC14)
  const [agreeClient, setAgreeClient] = useState(false)

  // Step 4: Liquidation checklist (UC15)
  const [checkedPaper, setCheckedPaper] = useState(false)
  const [checkedKeys, setCheckedKeys] = useState(false)
  const [checkedFinance, setCheckedFinance] = useState(false) // maps to tai_chinh_da_hoan_tat

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Load checkout report details
  const loadCheckoutData = async () => {
    setLoading(true)
    try {
      const res = await getBienBanTraPhong(bienBanId)
      if (res.success) {
        const data = res.data

        // Parse danh_sach_doi_soat safely
        if (data.danh_sach_doi_soat && typeof data.danh_sach_doi_soat === 'string') {
          try {
            data.danh_sach_doi_soat = JSON.parse(data.danh_sach_doi_soat)
          } catch (e) {
            console.error('Failed to parse danh_sach_doi_soat JSON:', e)
            data.danh_sach_doi_soat = []
          }
        }

        // Parse bien_ban_ban_giao.danh_sach_tai_san safely
        if (data.bien_ban_ban_giao && typeof data.bien_ban_ban_giao.danh_sach_tai_san === 'string') {
          try {
            data.bien_ban_ban_giao.danh_sach_tai_san = JSON.parse(data.bien_ban_ban_giao.danh_sach_tai_san)
          } catch (e) {
            console.error('Failed to parse handover assets list JSON:', e)
            data.bien_ban_ban_giao.danh_sach_tai_san = []
          }
        }

        setBienBan(data)

        // 1. Initialize Step 1 (Audit)
        setNgayTraThucTe(data.ngay_tra_thuc_te
          ? new Date(data.ngay_tra_thuc_te).toISOString().slice(0, 16)
          : (data.ngay_tra_phong_du_kien
            ? new Date(data.ngay_tra_phong_du_kien).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16)))

        if (data.danh_sach_doi_soat && data.danh_sach_doi_soat.length > 0) {
          setAuditList(data.danh_sach_doi_soat)
        } else if (data.bien_ban_ban_giao?.danh_sach_tai_san) {
          // Use baseline assets list from handover report
          const baseline = data.bien_ban_ban_giao.danh_sach_tai_san.map(item => ({
            ten: item.ten,
            tinh_trang: 'Tot', // default check status
            ghi_chu: '',
            chi_phi_boi_thuong: 0
          }))
          setAuditList(baseline)
        } else {
          // Default fallback checklist
          setAuditList([
            { ten: 'Giường', tinh_trang: 'Tot', ghi_chu: '', chi_phi_boi_thuong: 0 },
            { ten: 'Nệm', tinh_trang: 'Tot', ghi_chu: '', chi_phi_boi_thuong: 0 },
            { ten: 'Tủ quần áo', tinh_trang: 'Tot', ghi_chu: '', chi_phi_boi_thuong: 0 },
            { ten: 'Thẻ từ', tinh_trang: 'Tot', ghi_chu: '', chi_phi_boi_thuong: 0 }
          ])
        }

        // 2. Initialize Step 2 (Deductions)
        setTyLeHoanCoc(data.ty_le_hoan_coc !== null ? Number(data.ty_le_hoan_coc) : 100)
        setTienThueConNo(data.chi_phi_phat_sinh_tong ? Number(data.tien_thue_con_no || 0) : 0)
        setTienDienNuocDichVu(data.chi_phi_phat_sinh_tong ? Number(data.tien_dien_nuoc_dich_vu || 0) : 0)

        // Calculate repair sum
        const repairSum = data.danh_sach_doi_soat
          ? data.danh_sach_doi_soat.reduce((sum, item) => sum + Number(item.chi_phi_boi_thuong || 0), 0)
          : 0
        setChiPhiSuaChuaBoiThuong(data.chi_phi_phat_sinh_tong ? Number(data.chi_phi_sua_chua_boi_thuong || 0) : repairSum)
        setTienPhatViPham(data.chi_phi_phat_sinh_tong ? Number(data.tien_phat_vi_pham || 0) : 0)

        // 3. Initialize Step 3 (Confirmation)
        setAgreeClient(data.khach_xac_nhan_doi_soat || false)

        // 4. Auto determine step
        if (data.trang_thai === 'ChoDoiSoat') {
          setActiveStep(1)
        } else if (data.trang_thai === 'ChoXacNhan') {
          if (!data.ke_toan_xac_nhan_id) {
            setActiveStep(2)
          } else if (!data.khach_xac_nhan_doi_soat) {
            setActiveStep(3)
          } else {
            setActiveStep(4)
          }
        } else if (data.trang_thai === 'DaThanhLy') {
          setActiveStep(4)
          setCheckedPaper(true)
          setCheckedKeys(true)
          setCheckedFinance(true)
        }
      } else {
        showToast(res.error?.message || 'Không thể tải biên bản trả phòng.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Lỗi khi tải thông tin trả phòng.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bienBanId && bienBanId !== 'select') {
      loadCheckoutData()
    }
  }, [bienBanId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam && ['doisoat', 'thanhly', 'dathanhly'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [bienBanId])

  useEffect(() => {
    const fetchContracts = async () => {
      setLoadingContracts(true)
      try {
        const res = await searchHopDong(searchQuery)
        if (res.success) {
          // Lọc ra các hợp đồng có yêu cầu trả phòng (bien_ban_tra_phong_id không null)
          setContracts(res.data.filter(c => c.bien_ban_tra_phong_id !== null))
        }
      } catch (err) {
        console.error(err)
        showToast('Không thể tải danh sách yêu cầu trả phòng.', 'danger')
      } finally {
        setLoadingContracts(false)
      }
    }

    if (bienBanId === 'select') {
      fetchContracts()
    }
  }, [bienBanId, searchQuery])

  useEffect(() => {
    const fetchGoiY = async () => {
      if (isKeToan && bienBanId && bienBan && bienBan.trang_thai === 'ChoXacNhan' && !goiYTyLe) {
        try {
          const gyRes = await getGoiYTyLe(bienBanId)
          if (gyRes.success) {
            setGoiYTyLeState(gyRes.data)
            if (bienBan.ty_le_hoan_coc === null) {
              setTyLeHoanCoc(gyRes.data.ty_le_goi_y)
            }
          }
        } catch (gyErr) {
          console.error('Lỗi lấy gợi ý tỷ lệ hoàn cọc:', gyErr)
        }
      }
    }
    fetchGoiY()
  }, [isKeToan, bienBanId, bienBan, goiYTyLe])

  // Real-time cost preview for Step 2
  const soTienCocGoc = Number(bienBan?.so_tien_coc_goc || 0)
  const tienCocDuocHoan = soTienCocGoc * (tyLeHoanCoc / 100)
  const chiPhiPhatSinhTong = Number(tienThueConNo) + Number(tienDienNuocDichVu) + Number(chiPhiSuaChuaBoiThuong) + Number(tienPhatViPham)

  const resultHoanKhach = tienCocDuocHoan >= chiPhiPhatSinhTong ? (tienCocDuocHoan - chiPhiPhatSinhTong) : 0
  const resultKhachTraThem = chiPhiPhatSinhTong > tienCocDuocHoan ? (chiPhiPhatSinhTong - tienCocDuocHoan) : 0

  // Handle Step 1: Save Audit Checklist (Manager only)
  const handleSaveAudit = async () => {
    if (!isQuanLy) {
      showToast('Chỉ Quản lý mới có quyền ghi nhận kết quả đối soát.', 'warning')
      return
    }

    setActionLoading(true)
    setFieldErrors({})
    try {
      const payload = {
        ngay_tra_thuc_te: new Date(ngayTraThucTe).toISOString(),
        danh_sach_doi_soat: auditList
      }
      const res = await doSoatTaiSan(bienBanId, payload)
      if (res.success) {
        showToast('Đã hoàn tất đối soát tài sản thành công!')
        loadCheckoutData() // Reload to advance to Step 2
      } else {
        showToast(res.error?.message || 'Không thể hoàn tất đối soát.', 'danger')
      }
    } catch (err) {
      console.error(err)
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        showToast('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.', 'warning')
      } else {
        showToast(err.response?.data?.error?.message || err.message || 'Lỗi ghi nhận đối soát.', 'danger')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Step 2: Create Deductions (Accountant only)
  const handleSaveDeductions = async () => {
    if (!isKeToan) {
      showToast('Chỉ Kế toán mới có quyền lập phiếu khấu trừ chi phí.', 'warning')
      return
    }

    setActionLoading(true)
    setFieldErrors({})
    try {
      const payload = {
        ty_le_hoan_coc: Number(tyLeHoanCoc),
        tien_thue_con_no: Number(tienThueConNo),
        tien_dien_nuoc_dich_vu: Number(tienDienNuocDichVu),
        chi_phi_sua_chua_boi_thuong: Number(chiPhiSuaChuaBoiThuong),
        tien_phat_vi_pham: Number(tienPhatViPham)
      }
      const res = await khauTruChiPhi(bienBanId, payload)
      if (res.success) {
        showToast('Đã lập phiếu khấu trừ chi phí thành công!')
        loadCheckoutData() // Reload to advance to Step 3
      } else {
        showToast(res.error?.message || 'Lập phiếu khấu trừ thất bại.', 'danger')
      }
    } catch (err) {
      console.error(err)
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        showToast('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.', 'warning')
      } else {
        showToast(err.response?.data?.error?.message || err.message || 'Lỗi lập phiếu khấu trừ.', 'danger')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Step 3: Client Agreement (Manager/Sale only)
  const handleSaveClientAgreement = async () => {
    if (!isQuanLy) {
      showToast('Chỉ Quản lý (hoặc Sale) mới có quyền ghi nhận xác nhận khách hàng.', 'warning')
      return
    }

    if (!agreeClient) {
      showToast('Vui lòng tích xác nhận khách hàng đồng ý.', 'warning')
      return
    }

    setActionLoading(true)
    try {
      const res = await xacNhanKhach(bienBanId)
      if (res.success) {
        showToast('Đã ghi nhận khách hàng đồng ý thành công!')
        loadCheckoutData() // Reload to advance to Step 4
      } else {
        showToast(res.error?.message || 'Ghi nhận thất bại.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi ghi nhận xác nhận.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Step 4: Liquidate Contract (Manager only)
  const handleLiquidateContract = async () => {
    if (!isQuanLy) {
      showToast('Chỉ Quản lý mới có quyền thực hiện thanh lý hợp đồng.', 'warning')
      return
    }

    if (!checkedPaper || !checkedKeys) {
      showToast('Vui lòng hoàn thành các đầu việc checklist trước khi thanh lý.', 'warning')
      return
    }

    setActionLoading(true)
    try {
      const res = await thanhLyHopDong(bienBan.hop_dong_id, checkedFinance)
      if (res.success) {
        showToast('Hợp đồng đã được thanh lý thành công! Phòng và giường đã được giải phóng.', 'success')

        // Wait a brief moment to let toast show, then navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard-quan-ly')
        }, 2000)
      } else {
        showToast(res.error?.message || 'Thanh lý hợp đồng thất bại.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Lỗi thanh lý hợp đồng.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ'
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('vi-VN')
  }

  if (bienBanId === 'select') {
    return (
      <div className="layout">
        <Sidebar />

        <div className="main">
          <Header title="📋 Danh sách hồ sơ trả phòng" />

          <div className="content">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--gray-800)' }}>
                🚪 Xử lý hồ sơ trả phòng & thanh lý
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>
                {isKeToan
                  ? 'Danh sách hợp đồng đang chờ Kế toán tính toán các khoản khấu trừ phí phát sinh và tiền hoàn cọc.'
                  : 'Tìm kiếm và chọn hồ sơ trả phòng để đối soát tài sản (Quản lý) hoặc tiến hành kết thúc thanh lý hợp đồng.'}
              </p>

              {/* Tabs for Manager */}
              {isQuanLy && (
                <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--gray-200)', marginBottom: '20px', paddingBottom: '2px' }}>
                  <button
                    className={`btn ${activeTab === 'doisoat' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setActiveTab('doisoat')}
                  >
                    🔍 Chờ đối soát tài sản
                  </button>
                  <button
                    className={`btn ${activeTab === 'thanhly' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setActiveTab('thanhly')}
                  >
                    📄 Chờ thanh lý hợp đồng
                  </button>
                  <button
                    className={`btn ${activeTab === 'dathanhly' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ borderRadius: '20px', padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setActiveTab('dathanhly')}
                  >
                    ✅ Đã thanh lý hoàn tất
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Tìm theo mã HĐ, tên khách, SĐT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loadingContracts ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                  Đang tải danh sách hồ sơ trả phòng...
                </div>
              ) : (
                (() => {
                  // Filter contracts based on role and tab
                  let filtered = contracts;
                  if (isKeToan) {
                    filtered = contracts.filter(c => c.bien_ban_tra_phong_trang_thai === 'ChoXacNhan')
                  } else {
                    if (activeTab === 'doisoat') {
                      filtered = contracts.filter(c => c.bien_ban_tra_phong_trang_thai === 'ChoDoiSoat')
                    } else if (activeTab === 'thanhly') {
                      filtered = contracts.filter(c => c.bien_ban_tra_phong_trang_thai === 'ChoXacNhan')
                    } else {
                      filtered = contracts.filter(c => c.bien_ban_tra_phong_trang_thai === 'DaThanhLy')
                    }
                  }

                  if (filtered.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
                        📭 Không có hồ sơ nào cần xử lý trong mục này.
                      </div>
                    )
                  }

                  return (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="room-table">
                        <thead>
                          <tr>
                            <th>Mã hợp đồng</th>
                            <th>Khách đại diện</th>
                            <th>Số điện thoại</th>
                            <th>Phòng</th>
                            <th>Trạng thái hồ sơ</th>
                            <th>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((c) => (
                            <tr key={c.id}>
                              <td><strong>{c.ma_hop_dong}</strong></td>
                              <td>{c.ten_khach_hang}</td>
                              <td>{c.sdt_khach_hang}</td>
                              <td>Phòng {c.ma_phong}</td>
                              <td>
                                <span className={`badge ${c.bien_ban_tra_phong_trang_thai === 'ChoDoiSoat' ? 'status-pending' :
                                  c.bien_ban_tra_phong_trang_thai === 'ChoXacNhan' ? 'status-checking' :
                                    'status-success'
                                  }`}>
                                  {c.bien_ban_tra_phong_trang_thai === 'ChoDoiSoat' ? 'Chờ đối soát' :
                                    c.bien_ban_tra_phong_trang_thai === 'ChoXacNhan' ? 'Chờ xác nhận/Khấu trừ' :
                                      'Đã thanh lý'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => navigate(`/tra-phong/${c.bien_ban_tra_phong_id}`)}
                                >
                                  {isKeToan ? 'Tính tiền khấu trừ ➔' :
                                    c.bien_ban_tra_phong_trang_thai === 'ChoDoiSoat' ? 'Đối soát tài sản ➔' :
                                      c.bien_ban_tra_phong_trang_thai === 'ChoXacNhan' ? 'Thanh lý HĐ ➔' :
                                        'Xem chi tiết ➔'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Header title="Trả phòng" />
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }}></div>
            <p>Đang tải dữ liệu hồ sơ trả phòng...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout">
      <Sidebar />

      <div className="main">
        <Header title={`Hồ sơ trả phòng: ${bienBan?.ma_bien_ban}`} />

        <div className="content">
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

          {/* Stepper Wizard Header */}
          <div className="card" style={{ marginBottom: '24px', padding: '20px 32px' }}>
            <div className="stepper" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>

              {/* Step 1 */}
              <div
                className={`step-item ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}
                onClick={() => setActiveStep(1)}
                style={{ cursor: 'pointer', textAlign: 'center', flex: 1, zIndex: 1 }}
              >
                <div className="step-number" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: activeStep === 1 ? 'var(--primary)' : activeStep > 1 ? 'var(--success)' : 'var(--gray-300)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px auto', fontWeight: 'bold'
                }}>
                  {activeStep > 1 ? '✓' : '1'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: activeStep === 1 ? 600 : 400 }}>Kiểm tra phòng khi trả</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Quản lý</div>
              </div>

              {/* Step 2 */}
              <div
                className={`step-item ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}
                onClick={() => { if (bienBan.trang_thai !== 'ChoDoiSoat') setActiveStep(2) }}
                style={{ cursor: bienBan.trang_thai !== 'ChoDoiSoat' ? 'pointer' : 'not-allowed', textAlign: 'center', flex: 1, zIndex: 1 }}
              >
                <div className="step-number" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: activeStep === 2 ? 'var(--primary)' : activeStep > 2 ? 'var(--success)' : 'var(--gray-300)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px auto', fontWeight: 'bold'
                }}>
                  {activeStep > 2 ? '✓' : '2'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: activeStep === 2 ? 600 : 400 }}>Tính tiền hoàn cọc</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Kế toán</div>
              </div>

              {/* Step 3 */}
              <div
                className={`step-item ${activeStep >= 3 ? 'active' : ''} ${activeStep > 3 ? 'completed' : ''}`}
                onClick={() => { if (bienBan.ke_toan_xac_nhan_id) setActiveStep(3) }}
                style={{ cursor: bienBan.ke_toan_xac_nhan_id ? 'pointer' : 'not-allowed', textAlign: 'center', flex: 1, zIndex: 1 }}
              >
                <div className="step-number" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: activeStep === 3 ? 'var(--primary)' : activeStep > 3 ? 'var(--success)' : 'var(--gray-300)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px auto', fontWeight: 'bold'
                }}>
                  {activeStep > 3 ? '✓' : '3'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: activeStep === 3 ? 600 : 400 }}>Khách hàng xác nhận</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Sale / Quản lý</div>
              </div>

              {/* Step 4 */}
              <div
                className={`step-item ${activeStep >= 4 ? 'active' : ''} ${bienBan.trang_thai === 'DaThanhLy' ? 'completed' : ''}`}
                onClick={() => { if (bienBan.khach_xac_nhan_doi_soat) setActiveStep(4) }}
                style={{ cursor: bienBan.khach_xac_nhan_doi_soat ? 'pointer' : 'not-allowed', textAlign: 'center', flex: 1, zIndex: 1 }}
              >
                <div className="step-number" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: bienBan.trang_thai === 'DaThanhLy' ? 'var(--success)' : activeStep === 4 ? 'var(--primary)' : 'var(--gray-300)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px auto', fontWeight: 'bold'
                }}>
                  {bienBan.trang_thai === 'DaThanhLy' ? '✓' : '4'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: activeStep === 4 ? 600 : 400 }}>Kết thúc hợp đồng</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Quản lý</div>
              </div>

              {/* Connector line */}
              <div style={{
                position: 'absolute', top: '18px', left: '10%', right: '10%',
                height: '2px', background: 'var(--gray-200)', zIndex: 0
              }}></div>
            </div>
          </div>

          {/* Quick info banner */}
          <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '14px' }}>
            <div><strong>Hợp đồng:</strong> {bienBan.ma_hop_dong}</div>
            <div><strong>Khách đại diện:</strong> {bienBan.ten_khach_hang} ({bienBan.sdt_khach_hang})</div>
            <div><strong>Phòng:</strong> {bienBan.ma_phong}</div>
            <div><strong>Ngày đăng ký trả:</strong> {formatDate(bienBan.ngay_tra_phong_du_kien)}</div>
            <div><strong>Trạng thái hiện tại:</strong> <span className="badge badge-info">{getStatusText(bienBan.trang_thai)}</span></div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 1: ASSET AUDIT */}
          {/* ========================================================================= */}
          {activeStep === 1 && (
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '20px' }}>
                Step 1: Đối soát tài sản & hao mòn (UC13)
              </h3>

              {!bienBan.bien_ban_ban_giao && (
                <div className="alert alert-info" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '8px', color: '#1e40af', marginBottom: '20px' }}>
                  💡 <strong>Thông báo:</strong> Không tìm thấy biên bản bàn giao gốc cho hợp đồng này. Đang tiến hành đối soát thủ công không có baseline.
                </div>
              )}

              <div className="form-group" style={{ maxWidth: '300px', marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Ngày trả phòng thực tế:</label>
                <input
                  type="datetime-local"
                  className={`input ${fieldErrors.ngay_tra_thuc_te ? 'input-error' : ''}`}
                  value={ngayTraThucTe}
                  onChange={(e) => {
                    setNgayTraThucTe(e.target.value)
                    if (fieldErrors.ngay_tra_thuc_te) {
                      setFieldErrors(prev => ({ ...prev, ngay_tra_thuc_te: undefined }))
                    }
                  }}
                  disabled={!isQuanLy || bienBan.trang_thai !== 'ChoDoiSoat'}
                />
                <FieldError error={fieldErrors.ngay_tra_thuc_te} />
              </div>

              <h4 style={{ color: 'var(--gray-800)', marginBottom: '12px' }}>📋 Danh sách đối soát tài sản</h4>
              <table className="room-table" style={{ marginBottom: '24px' }}>
                <thead>
                  <tr>
                    <th>Tên tài sản</th>
                    {bienBan.bien_ban_ban_giao && <th>Tình trạng bàn giao</th>}
                    <th>Tình trạng trả phòng</th>
                    <th>Chi phí bồi thường (nếu hỏng/mất)</th>
                    <th>Ghi chú hiện trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {auditList.map((item, index) => {
                    const originalItem = bienBan.bien_ban_ban_giao?.danh_sach_tai_san?.find(
                      b => b && b.ten && item && item.ten && b.ten.toLowerCase() === item.ten.toLowerCase()
                    )

                    return (
                      <tr key={index}>
                        <td style={{ fontWeight: 600 }}>{item.ten}</td>
                        {bienBan.bien_ban_ban_giao && (
                          <td>
                            <span className="badge badge-success">
                              {originalItem ? getStatusText(originalItem.tinh_trang) : 'Tốt'}
                            </span>
                          </td>
                        )}
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '4px 8px', height: 'auto', width: '160px' }}
                            value={item.tinh_trang}
                            onChange={(e) => {
                              const updated = [...auditList]
                              updated[index].tinh_trang = e.target.value
                              // Reset cost if condition is good/usable
                              if (e.target.value === 'Tot' || e.target.value === 'DungDuoc') {
                                updated[index].chi_phi_boi_thuong = 0
                              }
                              setAuditList(updated)
                            }}
                            disabled={!isQuanLy || bienBan.trang_thai !== 'ChoDoiSoat'}
                          >
                            <option value="Tot">Tốt</option>
                            <option value="DungDuoc">Dùng được</option>
                            <option value="CanChuY">Cần chú ý</option>
                            <option value="HuHong">Hư hỏng</option>
                            <option value="MatMat">Mất mát</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: '4px 8px', height: 'auto', width: '180px' }}
                            value={item.chi_phi_boi_thuong}
                            onChange={(e) => {
                              const updated = [...auditList]
                              updated[index].chi_phi_boi_thuong = Number(e.target.value)
                              setAuditList(updated)
                            }}
                            disabled={!isQuanLy || bienBan.trang_thai !== 'ChoDoiSoat' || item.tinh_trang === 'Tot' || item.tinh_trang === 'DungDuoc'}
                            placeholder="Nhập chi phí VNĐ..."
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '4px 8px', height: 'auto' }}
                            value={item.ghi_chu}
                            onChange={(e) => {
                              const updated = [...auditList]
                              updated[index].ghi_chu = e.target.value
                              setAuditList(updated)
                            }}
                            disabled={!isQuanLy || bienBan.trang_thai !== 'ChoDoiSoat'}
                            placeholder="Ghi chú chi tiết..."
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {isQuanLy && bienBan.trang_thai === 'ChoDoiSoat' ? (
                <button
                  className="btn btn-primary"
                  onClick={handleSaveAudit}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Đang lưu đối soát...' : '💾 Hoàn tất đối soát tài sản'}
                </button>
              ) : (
                <div className="alert alert-warning" style={{ margin: 0, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                  {!isQuanLy
                    ? 'Chỉ tài khoản Quản lý mới được chỉnh sửa và nộp đối soát tài sản.'
                    : 'Biên bản này đã qua bước đối soát tài sản (đã khóa).'
                  }
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: FEE DEDUCTIONS */}
          {/* ========================================================================= */}
          {activeStep === 2 && (
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '20px' }}>
                Step 2: Khấu trừ chi phí phát sinh (UC14)
              </h3>

              <div className="grid grid-2" style={{ gap: '24px' }}>
                {/* Left panel: Form */}
                <div>
                  <h4 style={{ color: 'var(--gray-800)', marginBottom: '16px' }}>📝 Nhập thông số tài chính</h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Tỷ lệ hoàn cọc (%):</label>

                      {goiYTyLe && (
                        <div style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          color: '#1e40af',
                          marginBottom: '12px',
                          fontSize: '13px'
                        }}>
                          📌 <strong>Gợi ý từ hệ thống: {goiYTyLe.ty_le_goi_y}%</strong> ({goiYTyLe.ly_do})
                          {goiYTyLe.so_thang_luu_tru !== null && ` - Đã lưu trú: ${goiYTyLe.so_thang_luu_tru} tháng`}
                          {tyLeHoanCoc !== goiYTyLe.ty_le_goi_y && (
                            <button
                              type="button"
                              onClick={() => setTyLeHoanCoc(goiYTyLe.ty_le_goi_y)}
                              style={{
                                display: 'block',
                                marginTop: '6px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                            >
                              Áp dụng gợi ý
                            </button>
                          )}
                        </div>
                      )}

                      <input
                        type="number"
                        className={`input ${fieldErrors.ty_le_hoan_coc ? 'input-error' : ''}`}
                        min="0"
                        max="100"
                        value={tyLeHoanCoc}
                        onChange={(e) => {
                          setTyLeHoanCoc(Math.min(100, Math.max(0, Number(e.target.value))))
                          if (fieldErrors.ty_le_hoan_coc) {
                            setFieldErrors(prev => ({ ...prev, ty_le_hoan_coc: undefined }))
                          }
                        }}
                        disabled={!isKeToan || bienBan.trang_thai !== 'ChoXacNhan'}
                      />
                      <FieldError error={fieldErrors.ty_le_hoan_coc} />
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)', display: 'block', marginTop: '4px' }}>
                        💡 <em>Tỷ lệ hoàn cọc tự động tính dựa trên thời gian lưu trú và trạng thái hợp đồng. Có thể sửa đổi thủ công nếu cần.</em>
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Tiền thuê còn nợ (đ):</label>
                      <input
                        type="number"
                        className={`input ${fieldErrors.tien_thue_con_no ? 'input-error' : ''}`}
                        value={tienThueConNo}
                        onChange={(e) => {
                          setTienThueConNo(Number(e.target.value))
                          if (fieldErrors.tien_thue_con_no) {
                            setFieldErrors(prev => ({ ...prev, tien_thue_con_no: undefined }))
                          }
                        }}
                        disabled={!isKeToan || bienBan.trang_thai !== 'ChoXacNhan'}
                      />
                      <FieldError error={fieldErrors.tien_thue_con_no} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Tiền điện nước dịch vụ phát sinh (đ):</label>
                      <input
                        type="number"
                        className={`input ${fieldErrors.tien_dien_nuoc_dich_vu ? 'input-error' : ''}`}
                        value={tienDienNuocDichVu}
                        onChange={(e) => {
                          setTienDienNuocDichVu(Number(e.target.value))
                          if (fieldErrors.tien_dien_nuoc_dich_vu) {
                            setFieldErrors(prev => ({ ...prev, tien_dien_nuoc_dich_vu: undefined }))
                          }
                        }}
                        disabled={!isKeToan || bienBan.trang_thai !== 'ChoXacNhan'}
                      />
                      <FieldError error={fieldErrors.tien_dien_nuoc_dich_vu} />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Chi phí sửa chữa bồi thường (đ):</label>
                      <input
                        type="number"
                        className={`input ${fieldErrors.chi_phi_sua_chua_boi_thuong ? 'input-error' : ''}`}
                        value={chiPhiSuaChuaBoiThuong}
                        onChange={(e) => {
                          setChiPhiSuaChuaBoiThuong(Number(e.target.value))
                          if (fieldErrors.chi_phi_sua_chua_boi_thuong) {
                            setFieldErrors(prev => ({ ...prev, chi_phi_sua_chua_boi_thuong: undefined }))
                          }
                        }}
                        disabled={!isKeToan || bienBan.trang_thai !== 'ChoXacNhan'}
                      />
                      <FieldError error={fieldErrors.chi_phi_sua_chua_boi_thuong} />
                      <span style={{ fontSize: '12px', color: 'var(--gray-400)', display: 'block', marginTop: '4px' }}>
                        Tổng chi phí bồi thường ước tính từ đối soát: <strong>{formatMoney(
                          auditList.reduce((sum, item) => sum + Number(item.chi_phi_boi_thuong || 0), 0)
                        )}</strong>.
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Tiền phạt vi phạm nội quy (đ):</label>
                      <input
                        type="number"
                        className={`input ${fieldErrors.tien_phat_vi_pham ? 'input-error' : ''}`}
                        value={tienPhatViPham}
                        onChange={(e) => {
                          setTienPhatViPham(Number(e.target.value))
                          if (fieldErrors.tien_phat_vi_pham) {
                            setFieldErrors(prev => ({ ...prev, tien_phat_vi_pham: undefined }))
                          }
                        }}
                        disabled={!isKeToan || bienBan.trang_thai !== 'ChoXacNhan'}
                      />
                      <FieldError error={fieldErrors.tien_phat_vi_pham} />
                    </div>
                  </div>
                </div>

                {/* Right panel: Live Preview Calculations */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '24px' }}>
                  <h4 style={{ color: 'var(--gray-800)', marginBottom: '16px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px' }}>
                    📊 Bảng tính toán khấu trừ cọc
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tiền cọc gốc:</span>
                      <span style={{ fontWeight: 600 }}>{formatMoney(soTienCocGoc)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tỷ lệ hoàn cọc:</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{tyLeHoanCoc} %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--gray-200)', paddingBottom: '10px' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tiền cọc được hoàn:</span>
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatMoney(tienCocDuocHoan)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tiền thuê còn nợ:</span>
                      <span>{formatMoney(tienThueConNo)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tiền điện nước dịch vụ:</span>
                      <span>{formatMoney(tienDienNuocDichVu)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Chi phí sửa chữa bồi thường:</span>
                      <span>{formatMoney(chiPhiSuaChuaBoiThuong)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Tiền phạt vi phạm:</span>
                      <span>{formatMoney(tienPhatViPham)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--gray-800)', borderBottom: '2px solid var(--gray-300)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <span>Tổng chi phí phát sinh:</span>
                      <span>{formatMoney(chiPhiPhatSinhTong)}</span>
                    </div>

                    {resultHoanKhach >= 0 && resultKhachTraThem === 0 ? (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', color: '#065f46', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số tiền hoàn trả khách</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{formatMoney(resultHoanKhach)}</div>
                      </div>
                    ) : (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Khách hàng cần trả thêm</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{formatMoney(resultKhachTraThem)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--gray-200)', paddingTop: '20px' }}>
                {isKeToan && bienBan.trang_thai === 'ChoXacNhan' ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveDeductions}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Đang lập phiếu...' : '🧾 Lập phiếu khấu trừ chi phí'}
                  </button>
                ) : (
                  <div className="alert alert-warning" style={{ margin: 0, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                    {!isKeToan
                      ? 'Chỉ tài khoản Kế toán mới có quyền lập và chỉnh sửa khấu trừ chi phí.'
                      : 'Không ở trạng thái Chờ Xác Nhận hoặc đã qua bước lập khấu trừ.'
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CLIENT AGREEMENT */}
          {/* ========================================================================= */}
          {activeStep === 3 && (
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '20px' }}>
                Step 3: Khách hàng xác nhận đối soát (UC14)
              </h3>

              {!bienBan.ke_toan_xac_nhan_id ? (
                <div className="alert alert-danger" style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b', marginBottom: '24px' }}>
                  <strong>Chưa đủ điều kiện:</strong> Kế toán chưa lập phiếu khấu trừ chi phí. Vui lòng chuyển sang Bước 2 để Kế toán hoàn thành trước.
                </div>
              ) : (
                <div>
                  <div style={{ maxWidth: '600px', margin: '0 auto 24px auto', border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', padding: '16px', textAlign: 'center', fontWeight: 'bold' }}>
                      PHIẾU DỰ THẢO KHẤU TRỪ CHI PHÍ & HOÀN CỌC
                    </div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tiền cọc gốc:</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(bienBan.so_tien_coc_goc)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tỷ lệ hoàn cọc:</span>
                        <span style={{ fontWeight: 600 }}>{bienBan.ty_le_hoan_coc} %</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--gray-200)', paddingBottom: '10px' }}>
                        <span>Tiền cọc được hoàn:</span>
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {formatMoney(Number(bienBan.so_tien_coc_goc) * (Number(bienBan.ty_le_hoan_coc) / 100))}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--gray-300)', paddingBottom: '10px' }}>
                        <span>Tổng chi phí khấu trừ phát sinh:</span>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatMoney(bienBan.chi_phi_phat_sinh_tong)}</span>
                      </div>

                      {Number(bienBan.so_tien_hoan_khach) > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>
                          <span>SỐ TIỀN HOÀN TRẢ KHÁCH:</span>
                          <span>{formatMoney(bienBan.so_tien_hoan_khach)}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#991b1b' }}>
                          <span>KHÁCH CẦN NỘP THÊM:</span>
                          <span>{formatMoney(bienBan.so_tien_khach_can_tra_them)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ maxWidth: '600px', margin: '0 auto', border: '1px solid var(--gray-200)', padding: '20px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--gray-800)', marginBottom: '12px' }}>✍️ Ghi nhận sự đồng ý của khách</h4>
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                      Sau khi thông báo kết quả cho khách hàng, nếu khách đồng ý với bảng chi phí khấu trừ trên, tích chọn xác nhận để tiến hành thanh lý hợp đồng.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
                      <input
                        type="checkbox"
                        id="agreeClientCheckbox"
                        checked={agreeClient}
                        onChange={(e) => setAgreeClient(e.target.checked)}
                        disabled={!isQuanLy || bienBan.khach_xac_nhan_doi_soat}
                        style={{ marginTop: '4px' }}
                      />
                      <label htmlFor="agreeClientCheckbox" style={{ fontSize: '14px', color: 'var(--gray-700)', cursor: 'pointer', userSelect: 'none' }}>
                        <strong>Xác nhận:</strong> Khách hàng đã xem, đồng ý với kết quả đối soát và ký biên bản trả phòng bản cứng.
                      </label>
                    </div>

                    {isQuanLy && !bienBan.khach_xac_nhan_doi_soat ? (
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleSaveClientAgreement}
                        disabled={actionLoading || !agreeClient}
                      >
                        {actionLoading ? 'Đang ghi nhận...' : '✓ Xác nhận khách đồng ý'}
                      </button>
                    ) : (
                      <div className="alert alert-warning" style={{ margin: 0, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                        {!isQuanLy
                          ? 'Chỉ tài khoản Quản lý mới được thực hiện xác nhận khách đồng ý.'
                          : 'Khách hàng đã đồng ý đối soát này (quy trình đã khóa).'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CONTRACT LIQUIDATION */}
          {/* ========================================================================= */}
          {activeStep === 4 && (
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px', marginBottom: '20px' }}>
                Step 4: Hoàn tất & Thanh lý hợp đồng (UC15)
              </h3>

              {!bienBan.khach_xac_nhan_doi_soat ? (
                <div className="alert alert-danger" style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', color: '#991b1b', marginBottom: '24px' }}>
                  <strong>Chưa đủ điều kiện:</strong> Khách hàng chưa xác nhận đồng ý đối soát chi phí. Vui lòng hoàn thành Bước 3 trước.
                </div>
              ) : (
                <div>
                  <div style={{ maxWidth: '600px', margin: '0 auto 30px auto' }}>
                    <div className="alert alert-success" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px', color: '#065f46', marginBottom: '24px' }}>
                      🎉 <strong>Đã hoàn tất đối soát:</strong> Khách hàng đã đồng ý kết quả đối soát. Vui lòng hoàn thành các checklist nghiệp vụ thực tế dưới đây để thanh lý hợp đồng.
                    </div>

                    <h4 style={{ color: 'var(--gray-800)', marginBottom: '16px' }}>📋 Checklist công tác thanh lý thực tế</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--gray-200)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>

                      {/* Check 1 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input
                          type="checkbox"
                          id="checkPaper"
                          checked={checkedPaper}
                          onChange={(e) => setCheckedPaper(e.target.checked)}
                          disabled={!isQuanLy || bienBan.trang_thai === 'DaThanhLy'}
                          style={{ marginTop: '4px' }}
                        />
                        <label htmlFor="checkPaper" style={{ fontSize: '14px', color: 'var(--gray-700)', cursor: 'pointer' }}>
                          <strong>Biên bản trả phòng:</strong> Khách hàng đã ký đầy đủ chữ ký vào biên bản trả phòng bản cứng.
                        </label>
                      </div>

                      {/* Check 2 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <input
                          type="checkbox"
                          id="checkKeys"
                          checked={checkedKeys}
                          onChange={(e) => setCheckedKeys(e.target.checked)}
                          disabled={!isQuanLy || bienBan.trang_thai === 'DaThanhLy'}
                          style={{ marginTop: '4px' }}
                        />
                        <label htmlFor="checkKeys" style={{ fontSize: '14px', color: 'var(--gray-700)', cursor: 'pointer' }}>
                          <strong>Bàn giao chìa khóa & thẻ từ:</strong> Đã thu hồi toàn bộ chìa khóa phòng, thẻ từ tòa nhà của các thành viên.
                        </label>
                      </div>

                      {/* Check 3 */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: '1px dashed var(--gray-200)', paddingTop: '14px' }}>
                        <input
                          type="checkbox"
                          id="checkFinance"
                          checked={checkedFinance}
                          onChange={(e) => setCheckedFinance(e.target.checked)}
                          disabled={!isQuanLy || bienBan.trang_thai === 'DaThanhLy'}
                          style={{ marginTop: '4px' }}
                        />
                        <label htmlFor="checkFinance" style={{ fontSize: '14px', color: 'var(--gray-700)', cursor: 'pointer' }}>
                          <strong>Xác nhận nghĩa vụ tài chính:</strong> Đã thu đủ tiền mặt/chuyển khoản từ khách hàng (hoặc đã hoàn trả tiền mặt/chuyển khoản cọc cho khách hàng) số tiền:
                          <strong style={{ color: Number(bienBan.so_tien_hoan_khach) > 0 ? 'var(--success)' : 'var(--danger)', marginLeft: '6px' }}>
                            {Number(bienBan.so_tien_hoan_khach) > 0
                              ? `Hoàn khách ${formatMoney(bienBan.so_tien_hoan_khach)}`
                              : `Khách trả thêm ${formatMoney(bienBan.so_tien_khach_can_tra_them)}`
                            }
                          </strong>.
                        </label>
                      </div>
                    </div>

                    {bienBan.trang_thai === 'DaThanhLy' ? (
                      <div style={{ textItems: 'center', background: '#f1f5f9', border: '1px solid var(--gray-300)', padding: '20px', borderRadius: '8px', color: 'var(--gray-600)', textAlign: 'center' }}>
                        <h4 style={{ margin: 0, color: 'var(--success)' }}>🎉 Hợp đồng đã được thanh lý thành công</h4>
                        <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                          Trạng thái phòng và giường đã được tự động giải phóng về trạng thái <strong>Trống</strong>.
                        </p>
                      </div>
                    ) : isQuanLy ? (
                      <button
                        className="btn btn-danger"
                        style={{ width: '100%', padding: '14px', fontWeight: 'bold', fontSize: '16px' }}
                        onClick={handleLiquidateContract}
                        disabled={actionLoading || !checkedPaper || !checkedKeys}
                      >
                        {actionLoading ? 'Đang thanh lý...' : '🚪 XÁC NHẬN THANH LÝ HỢP ĐỒNG'}
                      </button>
                    ) : (
                      <div className="alert alert-warning" style={{ margin: 0, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309' }}>
                        Chỉ tài khoản Quản lý mới được ký quyết định Thanh lý hợp đồng.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
