import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import { getHopDong, searchHopDong } from '../../api/hopDong.api'
import { getTaiSanPhong, taoBienBan, capNhatDanhSachTaiSan, xacNhanBanGiao, getBienBanByHopDong } from '../../api/bienBanBanGiao.api'
import { supabase } from '../../lib/supabaseClient'
import { FieldError } from '../../components/shared/FieldError'
import { parseValidationErrors } from '../../utils/fieldNameMap'

export default function BanGiaoPhong() {
  const { hopDongId } = useParams()
  const navigate = useNavigate()

  // Wizard steps: 1: Lập/Kiểm tra hiện trạng, 2: Ký xác nhận & Hoàn tất, 3: Thành công
  const [activeStep, setActiveStep] = useState(1)
  
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [contract, setContract] = useState(null)
  const [bienBan, setBienBan] = useState(null)

  // Danh sách hợp đồng khi chọn 'select'
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Step 1: Checklist & Notes
  const [tinhTrangPhong, setTinhTrangPhong] = useState('')
  const [assetsList, setAssetsList] = useState([]) // Array of { ten, so_luong, tinh_trang, ghi_chu }
  
  // Step 2: Upload signature sheet
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [agreeHandover, setAgreeHandover] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Toast notifications
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Load contracts list when hopDongId is 'select'
  useEffect(() => {
    const fetchContracts = async () => {
      setLoadingContracts(true)
      try {
        const res = await searchHopDong(searchQuery)
        if (res.success) {
          // Lọc các hợp đồng ở trạng thái Hiệu Lực
          setContracts(res.data.filter(c => c.trang_thai === 'HieuLuc'))
        }
      } catch (err) {
        console.error(err)
        showToast('Không thể tải danh sách hợp đồng.', 'danger')
      } finally {
        setLoadingContracts(false)
      }
    }

    if (hopDongId === 'select') {
      fetchContracts()
    }
  }, [hopDongId, searchQuery])

  // Load contract and handover details or assets on mount
  useEffect(() => {
    const loadHandoverData = async () => {
      setLoading(true)
      try {
        // 1. Fetch contract
        const contractRes = await getHopDong(hopDongId)
        if (!contractRes.success) throw new Error('Không thể tải thông tin hợp đồng.')
        const currentContract = contractRes.data
        setContract(currentContract)

        // 2. Check if a handover report already exists for this contract
        const existingBBGRes = await getBienBanByHopDong(hopDongId)
        if (existingBBGRes.success && existingBBGRes.data) {
          const currentBBG = existingBBGRes.data
          setBienBan(currentBBG)
          setTinhTrangPhong(currentBBG.tinh_trang_phong || '')
          
          let parsedAssets = currentBBG.danh_sach_tai_san
          if (typeof parsedAssets === 'string') {
            try {
              parsedAssets = JSON.parse(parsedAssets)
            } catch (e) {
              console.error('Failed to parse assets list JSON:', e)
              parsedAssets = []
              showToast('Cảnh báo: Định dạng dữ liệu tài sản bàn giao bị lỗi (JSON parse error). Vui lòng liên hệ hỗ trợ!', 'warning')
            }
          }
          setAssetsList(parsedAssets || [])
          
          if (currentBBG.khach_da_ky_xac_nhan) {
            // Already finalized
            setActiveStep(3)
          } else {
            // Created but not signed, continue to Step 1 or 2
            setActiveStep(1)
          }
        } else {
          // 3. If no handover report exists, load default assets checklist for this room
          const assetsRes = await getTaiSanPhong(currentContract.phong_id)
          if (assetsRes.success) {
            let defaultAssets = assetsRes.data
            if (typeof defaultAssets === 'string') {
              try {
                defaultAssets = JSON.parse(defaultAssets)
              } catch (e) {
                defaultAssets = []
                showToast('Cảnh báo: Định dạng danh mục tài sản gốc bị lỗi (JSON parse error). Vui lòng liên hệ hỗ trợ!', 'warning')
              }
            }
            setAssetsList(defaultAssets || [])
          }
        }
      } catch (err) {
        console.error(err)
        showToast(err.message || 'Lỗi khi tải thông tin bàn giao phòng.', 'danger')
      } finally {
        setLoading(false)
      }
    }

    if (hopDongId && hopDongId !== 'select') {
      loadHandoverData()
    }
  }, [hopDongId])

  // Track if any asset has unresolved issues
  const hasUnresolvedIssues = assetsList.some(item => 
    item.tinh_trang === 'HuHong' || item.tinh_trang === 'MatMat'
  )

  // Handle asset status dropdown changes
  const handleAssetStatusChange = (index, status) => {
    const updated = [...assetsList]
    updated[index] = { ...updated[index], tinh_trang: status }
    setAssetsList(updated)
  }

  // Handle asset notes changes
  const handleAssetNoteChange = (index, note) => {
    const updated = [...assetsList]
    updated[index] = { ...updated[index], ghi_chu: note }
    setAssetsList(updated)
  }

  // Step 1: Create or update handover report
  const handleSaveHandover = async () => {
    if (assetsList.length === 0) {
      showToast('Danh sách tài sản trống. Vui lòng kiểm tra lại.', 'warning')
      return
    }

    setActionLoading(true)
    setFieldErrors({})
    try {
      if (bienBan) {
        // Update existing report checklist
        const res = await capNhatDanhSachTaiSan(bienBan.id, assetsList)
        if (res.success) {
          setBienBan(res.data)
          showToast('Đã cập nhật biên bản bàn giao thành công!')
          
          if (!hasUnresolvedIssues) {
            setActiveStep(2)
          } else {
            showToast('Biên bản đã lưu nhưng vẫn còn tài sản lỗi/mất. Vui lòng khắc phục trước khi tiến hành ký.', 'warning')
          }
        }
      } else {
        // Create new handover report
        const payload = {
          hop_dong_id: contract.id,
          tinh_trang_phong: tinhTrangPhong,
          danh_sach_tai_san: assetsList
        }
        const res = await taoBienBan(payload)
        if (res.success) {
          setBienBan(res.data)
          showToast('Đã khởi tạo biên bản bàn giao phòng thành công!')
          
          if (!hasUnresolvedIssues) {
            setActiveStep(2)
          } else {
            showToast('Biên bản đã được lưu ở chế độ chờ khắc phục tài sản hư hại.', 'warning')
          }
        }
      }
    } catch (err) {
      console.error(err)
      if (err.code === 'VALIDATION_ERROR') {
        const errors = parseValidationErrors(err)
        setFieldErrors(errors)
        showToast('Vui lòng kiểm tra lại các thông tin chưa hợp lệ.', 'warning')
      } else {
        showToast(err.response?.data?.error?.message || err.message || 'Lỗi khi ghi nhận biên bản.', 'danger')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Handle signature sheet file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Step 2: Upload signature sheet and finalize handover
  const handleFinalizeHandover = async () => {
    if (hasUnresolvedIssues) {
      showToast('Vui lòng khắc phục toàn bộ tài sản lỗi/mất trước khi ký.', 'danger')
      return
    }
    if (!agreeHandover) {
      showToast('Vui lòng tick xác nhận khách hàng đồng ý với tình trạng tài sản.', 'warning')
      return
    }

    setActionLoading(true)
    try {
      let publicUrl = null

      if (selectedFile) {
        // 1. Upload to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `bbg_${contract.id}_${Date.now()}.${fileExt}`
        const filePath = `${contract.id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bien-ban')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) throw uploadError

        // 2. Get Public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from('bien-ban')
          .getPublicUrl(filePath)
        
        publicUrl = url
      }

      // 3. Finalize handover in backend
      const res = await xacNhanBanGiao(bienBan.id, publicUrl)
      if (res.success) {
        setBienBan(res.data)
        showToast('Bàn giao phòng thành công! Phòng/giường đã được chuyển sang trạng thái Đang Thuê.')
        setActiveStep(3)
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi khi hoàn tất bàn giao.', 'danger')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Giao phòng cho khách" />
        
        <div className="content">
          {/* Step Progress Indicator */}
          <div className="wizard-steps" style={{ maxWidth: '600px', margin: '0 auto 32px auto' }}>
            <div className={`wizard-step ${activeStep === 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <span>Kiểm tra tài sản</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 1 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <span>Ký xác nhận</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 2 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 3 ? 'completed' : ''}`}>
              <div className="step-number">✓</div>
              <span>Bắt đầu ở</span>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-500)' }}>
              Đang tải thông tin biên bản...
            </div>
          ) : hopDongId === 'select' ? (
            <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--gray-800)' }}>
                🏠 Chọn hợp đồng để bàn giao phòng
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>
                Chọn hợp đồng mới ở trạng thái <strong>Hiệu Lực</strong> (và đã thanh toán kỳ đầu) để thực hiện kiểm kê tài sản và bàn giao chìa khóa cho khách dời vào.
              </p>

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
                  Đang tải danh sách hợp đồng...
                </div>
              ) : contracts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
                  📭 Không tìm thấy hợp đồng nào cần xử lý.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="room-table">
                    <thead>
                      <tr>
                        <th>Mã hợp đồng</th>
                        <th>Khách đại diện</th>
                        <th>Số điện thoại</th>
                        <th>Phòng</th>
                        <th>Ngày bắt đầu</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.ma_hop_dong}</strong></td>
                          <td>{c.ten_khach_hang}</td>
                          <td>{c.sdt_khach_hang}</td>
                          <td>Phòng {c.ma_phong}</td>
                          <td>{new Date(c.ngay_bat_dau).toLocaleDateString('vi-VN')}</td>
                          <td>
                            <span className="badge status-pending" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 'bold' }}>
                              Hiệu Lực
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/ban-giao-phong/${c.id}`)}
                            >
                              Bàn giao ➔
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : !contract ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--danger)' }}>
              Không thể tìm thấy thông tin hợp đồng.
            </div>
          ) : (
            <div>
              
              {/* STEP 1: KIỂM TRA HIỆN TRẠNG */}
              {activeStep === 1 && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', color: 'var(--gray-800)', margin: 0 }}>
                        Bước 1: Kiểm tra tài sản phòng {contract.ma_phong}
                      </h2>
                      <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                        Hợp đồng: <strong>{contract.ma_hop_dong}</strong> | Vị trí: <strong>Phòng {contract.ma_phong}</strong>
                      </p>
                    </div>
                    <span className="badge status-pending" style={{ fontSize: '12px', padding: '6px 12px' }}>
                      {bienBan ? 'Đã lưu biên bản nhận phòng' : 'Chưa lập biên bản nhận phòng'}
                    </span>
                  </div>

                  {/* Warning banner for damaged or missing assets */}
                  {hasUnresolvedIssues && (
                    <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '13px', fontWeight: 600 }}>
                      ⚠️ Phát hiện tài sản có vấn đề (Hư hỏng hoặc Mất mát). Vui lòng khắc phục/thay thế thực tế trước khi ký xác nhận bàn giao phòng.
                    </div>
                  )}

                  {/* General Room Notes */}
                  <div>
                    <label className="form-label">Ghi chú hiện trạng chung của phòng:</label>
                    <textarea 
                      className={`textarea ${fieldErrors.tinh_trang_phong ? 'input-error' : ''}`}
                      rows="2" 
                      placeholder="Ghi chú về trần, sàn, tường, hệ thống đèn, điều hòa, khóa cửa..."
                      value={tinhTrangPhong}
                      onChange={(e) => {
                        setTinhTrangPhong(e.target.value)
                        if (fieldErrors.tinh_trang_phong) {
                          setFieldErrors(prev => ({ ...prev, tinh_trang_phong: undefined }))
                        }
                      }}
                    />
                    <FieldError error={fieldErrors.tinh_trang_phong} />
                  </div>

                  {/* Checklist Table */}
                  <div>
                    <h4 style={{ color: 'var(--gray-800)', marginBottom: '8px' }}>📋 Bảng checklist tài sản bàn giao</h4>
                    <table className="room-table">
                      <thead>
                        <tr>
                          <th>Tên tài sản</th>
                          <th style={{ width: '100px' }}>Số lượng</th>
                          <th style={{ width: '200px' }}>Tình trạng thực tế</th>
                          <th>Ghi chú chi tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetsList.map((item, index) => (
                          <tr key={index}>
                            <td><strong>{item.ten}</strong></td>
                            <td>{item.so_luong}</td>
                            <td>
                              <select 
                                className="select"
                                value={item.tinh_trang}
                                onChange={(e) => handleAssetStatusChange(index, e.target.value)}
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '13px',
                                  color: item.tinh_trang === 'Tot' || item.tinh_trang === 'DungDuoc' ? 'var(--success-dark, #166534)' : item.tinh_trang === 'CanChuY' ? '#b45309' : 'var(--danger)'
                                }}
                              >
                                <option value="Tot">Tốt / Mới</option>
                                <option value="DungDuoc">Dùng tốt / Bình thường</option>
                                <option value="CanChuY">Cần chú ý</option>
                                <option value="HuHong">Hư hỏng / Hỏng hóc</option>
                                <option value="MatMat">Mất mát / Thiếu hụt</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input" 
                                placeholder="Nhập ghi chú chi tiết nếu có..."
                                value={item.ghi_chu}
                                onChange={(e) => handleAssetNoteChange(index, e.target.value)}
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                    <button className="btn btn-outline" onClick={() => navigate('/dashboard-quan-ly')}>
                      ⬅ Quay lại Dashboard
                    </button>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleSaveHandover}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Đang ghi nhận...' : bienBan ? '💾 Cập nhật biên bản' : '💾 Lưu biên bản hiện trạng'}
                      </button>

                      {bienBan && !hasUnresolvedIssues && (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => setActiveStep(2)}
                          style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          Tiếp tục Ký xác nhận ➔
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: KÝ XÁC NHẬN & HOÀN TẤT */}
              {activeStep === 2 && bienBan && (
                <div className="grid-2">
                  {/* Left: Checklist summary (readonly) */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px', margin: 0 }}>
                      📋 Tóm tắt biên bản nhận phòng
                    </h3>

                    <div><strong>Mã biên bản:</strong> {bienBan.ma_bien_ban}</div>
                    <div><strong>Ghi chú phòng chung:</strong> {tinhTrangPhong || 'Không có ghi chú'}</div>

                    <table className="room-table" style={{ background: '#f8fafc', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Tài sản</th>
                          <th>SL</th>
                          <th>Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetsList.map((item, index) => (
                          <tr key={index}>
                            <td>{item.ten}</td>
                            <td>{item.so_luong}</td>
                            <td>
                              <span className="badge" style={{ 
                                background: item.tinh_trang === 'Tot' || item.tinh_trang === 'DungDuoc' ? '#dcfce7' : '#fee2e2',
                                color: item.tinh_trang === 'Tot' || item.tinh_trang === 'DungDuoc' ? '#15803d' : '#b91c1c',
                                fontSize: '11px',
                                padding: '4px 8px'
                              }}>
                                {item.tinh_trang === 'Tot' ? 'Tốt' : item.tinh_trang === 'DungDuoc' ? 'Dùng được' : item.tinh_trang === 'CanChuY' ? 'Cần chú ý' : item.tinh_trang === 'HuHong' ? 'Hỏng' : 'Mất'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Right: Signature upload & Checkbox */}
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                    <div>
                      <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px', margin: 0, marginBottom: '16px' }}>
                        ✍️ Ký xác nhận giao phòng
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label className="form-label">Tải lên ảnh biên bản ký giấy (Nếu có):</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            style={{ display: 'block', marginTop: '4px', fontSize: '13px' }}
                          />
                        </div>

                        {previewUrl && (
                          <div style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px' }}>
                            <img 
                              src={previewUrl} 
                              alt="Xem trước ảnh biên bản" 
                              style={{ width: '100%', height: 'auto', maxHeight: '190px', objectFit: 'contain', background: '#f8fafc' }} 
                            />
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '12px', marginTop: '8px' }}>
                          <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--gray-700)', fontWeight: 600 }}>
                            <input 
                              type="checkbox" 
                              checked={agreeHandover} 
                              onChange={(e) => setAgreeHandover(e.target.checked)} 
                              style={{ marginTop: '3px' }}
                            />
                            <span>Tôi xác nhận khách hàng đã trực tiếp kiểm tra thực tế, ký biên bản giấy, đồng ý nhận chìa khóa và bắt đầu thời gian cư trú chính thức tại Homestay Dorm.</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => setActiveStep(1)} 
                        disabled={actionLoading}
                        style={{ flex: 1 }}
                      >
                        ⬅ Quay lại
                      </button>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleFinalizeHandover}
                        disabled={actionLoading || !agreeHandover}
                        style={{ flex: 1, background: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        {actionLoading ? 'Đang hoàn tất...' : '✅ Hoàn tất giao phòng'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: THÀNH CÔNG */}
              {activeStep === 3 && (
                <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '550px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#15803d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    ✓
                  </div>
                  
                  <div>
                    <h1 style={{ fontSize: '22px', color: 'var(--gray-800)', margin: 0 }}>Giao phòng cho khách hoàn tất!</h1>
                    <p style={{ fontSize: '14px', color: 'var(--success-dark, #15803d)', fontWeight: 'bold', marginTop: '8px', background: '#dcfce7', padding: '10px 16px', borderRadius: '8px' }}>
                      🎉 Khách hàng chính thức bắt đầu cư trú. Trạng thái phòng/giường đã chuyển sang Đang Thuê.
                    </p>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)', width: '100%', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><strong>Hợp đồng thuê:</strong> {contract.ma_hop_dong}</div>
                    <div><strong>Mã biên bản:</strong> {bienBan?.ma_bien_ban}</div>
                    <div><strong>Thời gian dời vào thực tế:</strong> {new Date().toLocaleDateString('vi-VN')}</div>
                    <div><strong>Số lượng cư dân kích hoạt:</strong> {contract.thanh_vien?.length || 0} người</div>
                    {bienBan?.anh_bien_ban_url && (
                      <div><strong>Ảnh biên bản lưu trữ:</strong> <a href={bienBan.anh_bien_ban_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Xem ảnh biên bản đã lưu ↗</a></div>
                    )}
                  </div>

                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/dashboard-quan-ly')}
                    style={{ width: '100%' }}
                  >
                    🏠 Về Dashboard Quản lý
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
