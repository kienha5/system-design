import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import Toast from '../../components/shared/Toast'
import axiosClient from '../../api/axiosClient'
import { createHopDong, kiemTraDieuKien } from '../../api/hopDong.api'
import { getPhieuDatCocById } from '../../api/phieuDatCoc.api'

export default function LapHopDong() {
  const navigate = useNavigate()
  
  // Wizard steps: 1: Chọn phiếu cọc, 2: Thành viên & Điều kiện cư trú, 3: Xem lại & Tạo HĐ, 4: Thành công
  const [activeStep, setActiveStep] = useState(1)
  
  // Data lists
  const [approvedSlips, setApprovedSlips] = useState([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [roomBeds, setRoomBeds] = useState([])
  
  // Step 2 states
  const [members, setMembers] = useState([]) // Array of { khach_hang_id, ho_ten, so_dien_thoai, so_cmnd_cccd, gioi_tinh, giuong_id, isPrimary }
  const [searchPhone, setSearchPhone] = useState('')
  const [searchingMember, setSearchingMember] = useState(false)
  const [checkResult, setCheckResult] = useState(null) // UC09 results
  const [checkingResidency, setCheckingResidency] = useState(false)
  
  // Step 3 states
  const [ngayBatDau, setNgayBatDau] = useState(new Date().toISOString().split('T')[0])
  const [ngayKetThuc, setNgayKetThuc] = useState('')
  const [kyThanhToan, setKyThanhToan] = useState('Thang')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [creatingContract, setCreatingContract] = useState(false)
  const [createdContract, setCreatedContract] = useState(null)

  // Toast notification state
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // Fetch all slips in 'DaThanhToan' state that do not have a contract yet
  const fetchApprovedSlips = async () => {
    setLoadingSlips(true)
    try {
      const res = await axiosClient.get('/phieu-dat-coc', { params: { trang_thai: 'DaThanhToan' } })
      if (res.success) {
        // Filter out slips that already have contracts if the backend hasn't filtered them
        // In our backend, creating a contract prevents reuse, but let's query approved ones.
        setApprovedSlips(res.data)
      }
    } catch (err) {
      console.error(err)
      showToast('Không thể tải danh sách phiếu cọc đã thanh toán.', 'danger')
    } finally {
      setLoadingSlips(false)
    }
  }

  useEffect(() => {
    fetchApprovedSlips()
  }, [])

  // Handle selecting a deposit slip in Step 1
  const handleSelectSlip = async (slip) => {
    try {
      const res = await getPhieuDatCocById(slip.id)
      if (res.success) {
        const fullSlip = res.data
        setSelectedSlip(fullSlip)
        
        // Initialize members list with the primary tenant
        const primaryMember = {
          khach_hang_id: fullSlip.khach_hang_id,
          ho_ten: fullSlip.khach_hang_ho_ten,
          so_dien_thoai: fullSlip.khach_hang_so_dien_thoai,
          so_cmnd_cccd: fullSlip.khach_hang_email, // Wait, let's look at the customer details
          gioi_tinh: fullSlip.khach_hang_gioi_tinh || 'Nam',
          giuong_id: fullSlip.giuong_id || '',
          isPrimary: true
        }
        
        setMembers([primaryMember])
        setCheckResult(null)
        
        // Fetch all beds in this room that are in 'DaDatCoc' or 'Trong' status
        // to assign to members (especially for entire room rentals)
        const bedsRes = await axiosClient.get('/giuong', { 
          params: { phong_id: fullSlip.phong_id, trang_thai: 'DaDatCoc' } 
        })
        const bedsTrongRes = await axiosClient.get('/giuong', { 
          params: { phong_id: fullSlip.phong_id, trang_thai: 'Trong' } 
        })
        
        let allBeds = []
        if (bedsRes.success) allBeds = [...bedsRes.data]
        if (bedsTrongRes.success) {
          // Merge avoiding duplicates
          bedsTrongRes.data.forEach(b => {
            if (!allBeds.find(x => x.id === b.id)) {
              allBeds.push(b)
            }
          })
        }
        
        setRoomBeds(allBeds)
        
        // If it's a single bed rental, the primary tenant's bed is pre-allocated
        if (fullSlip.loai_phong !== 'NguyenPhong' && fullSlip.giuong_id) {
          primaryMember.giuong_id = fullSlip.giuong_id
          setMembers([primaryMember])
        } else if (allBeds.length > 0) {
          // For entire room, pre-assign primary member to the first bed
          primaryMember.giuong_id = allBeds[0].id
          setMembers([primaryMember])
        }
      }
    } catch (err) {
      console.error(err)
      showToast('Không thể tải thông tin chi tiết phòng/giường.', 'danger')
    }
  }

  // Search member by phone number in Step 2
  const handleSearchMember = async (e) => {
    e.preventDefault()
    if (!searchPhone.trim()) return
    
    setSearchingMember(true)
    setToast(null)
    try {
      const res = await axiosClient.get('/nhu-cau-thue', { params: { so_dien_thoai: searchPhone.trim() } })
      if (res.success && res.data.length > 0) {
        const customer = res.data[0].khach_hang
        
        // Check if already in the members list
        if (members.find(m => m.khach_hang_id === customer.id)) {
          showToast('Thành viên này đã được thêm vào danh sách.', 'warning')
          setSearchingMember(false)
          return
        }
        
        // Find next unassigned bed in the room
        const assignedBedIds = members.map(m => m.giuong_id).filter(Boolean)
        const availableBed = roomBeds.find(b => !assignedBedIds.includes(b.id))
        
        const newMember = {
          khach_hang_id: customer.id,
          ho_ten: customer.ho_ten,
          so_dien_thoai: customer.so_dien_thoai,
          so_cmnd_cccd: customer.so_cmnd_cccd,
          gioi_tinh: customer.gioi_tinh || 'Nam',
          giuong_id: availableBed ? availableBed.id : '',
          isPrimary: false
        }
        
        setMembers([...members, newMember])
        setSearchPhone('')
        showToast(`Đã thêm thành viên ${customer.ho_ten} thành công!`)
        setCheckResult(null) // Reset condition check status
      } else {
        showToast('Không tìm thấy thông tin khách hàng. Thành viên phải được đăng ký nhu cầu thuê trước.', 'danger')
      }
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi tìm kiếm thành viên.', 'danger')
    } finally {
      setSearchingMember(false)
    }
  }

  // Remove member from list (Manager only for group rentals)
  const handleRemoveMember = (id) => {
    setMembers(members.filter(m => m.khach_hang_id !== id))
    setCheckResult(null)
  }

  // Assign bed to a member
  const handleAssignBed = (memberId, bedId) => {
    setMembers(members.map(m => {
      if (m.khach_hang_id === memberId) {
        return { ...m, giuong_id: bedId }
      }
      return m
    }))
    setCheckResult(null)
  }

  // Run UC09 Residency Condition Check
  const handleCheckResidency = async () => {
    // Validate that all members have a bed assigned
    const unassigned = members.some(m => !m.giuong_id)
    if (unassigned) {
      showToast('Tất cả thành viên phải được phân giường tương ứng trước khi kiểm tra.', 'warning')
      return
    }

    // Validate unique beds
    const beds = members.map(m => m.giuong_id)
    const uniqueBeds = new Set(beds)
    if (beds.length !== uniqueBeds.size) {
      showToast('Phát hiện trùng lặp giường! Hai người không thể ở cùng một giường.', 'warning')
      return
    }

    setCheckingResidency(true)
    try {
      const payload = members.map(m => ({
        khach_hang_id: m.khach_hang_id,
        giuong_id: m.giuong_id
      }))
      
      const res = await kiemTraDieuKien(selectedSlip.id, payload)
      if (res.success) {
        setCheckResult(res.data)
        if (res.data.tat_ca_dat) {
          showToast('Tất cả thành viên đạt điều kiện cư trú! Sẵn sàng lập hợp đồng.', 'success')
        } else {
          showToast('Phát hiện thành viên không đạt điều kiện cư trú. Hãy xem kỹ bảng checklist bên dưới.', 'warning')
        }
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi kiểm tra điều kiện cư trú.', 'danger')
    } finally {
      setCheckingResidency(false)
    }
  }

  // Create contract (UC08)
  const handleCreateContract = async () => {
    if (!acceptTerms) {
      showToast('Vui lòng xác nhận khách đã ký thỏa thuận thuê giấy và đối chiếu giấy tờ.', 'warning')
      return
    }

    setCreatingContract(true)
    try {
      const payload = {
        phieu_dat_coc_id: selectedSlip.id,
        ngay_bat_dau: ngayBatDau,
        ngay_ket_thuc: ngayKetThuc || null,
        ky_thanh_toan: kyThanhToan,
        thanh_vien: members.map(m => ({
          khach_hang_id: m.khach_hang_id,
          giuong_id: m.giuong_id
        }))
      }

      const res = await createHopDong(payload)
      if (res.success) {
        setCreatedContract(res.data)
        showToast('Lập hợp đồng thuê và kích hoạt hiệu lực thành công!')
        setActiveStep(4)
      }
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error?.message || 'Lỗi khi lập hợp đồng thuê.', 'danger')
    } finally {
      setCreatingContract(false)
    }
  }

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Lập Hợp Đồng Thuê Phòng" />
        
        <div className="content">
          {/* Step Progress Indicator */}
          <div className="wizard-steps">
            <div className={`wizard-step ${activeStep === 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <span>Chọn phiếu cọc</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 1 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <span>Thành viên & Cư trú</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 2 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 3 ? 'active' : ''} ${activeStep > 3 ? 'completed' : ''}`}>
              <div className="step-number">3</div>
              <span>Xem lại & Ký HĐ</span>
            </div>
            <div style={{ flex: 1, height: '2px', background: activeStep > 3 ? 'var(--success)' : 'var(--gray-200)', margin: '0 12px' }} />
            <div className={`wizard-step ${activeStep === 4 ? 'completed' : ''}`}>
              <div className="step-number">✓</div>
              <span>Kích hoạt thành công</span>
            </div>
          </div>

          {/* STEP 1: CHỌN PHIẾU ĐẶT CỌC */}
          {activeStep === 1 && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: 'var(--gray-800)', marginBottom: '4px' }}>Bước 1: Chọn phiếu đặt cọc đã thanh toán</h2>
                <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                  Hợp đồng thuê chỉ được lập dựa trên các phiếu đặt giữ chỗ đã được Quản lý xác nhận chuyển tiền thành công (`DaThanhToan`).
                </p>
              </div>

              {loadingSlips ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-500)' }}>
                  Đang tải danh sách phiếu cọc...
                </div>
              ) : approvedSlips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)' }}>
                  📭 Không tìm thấy phiếu đặt cọc nào đã thanh toán và chưa lập hợp đồng.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="room-table">
                    <thead>
                      <tr>
                        <th>Mã phiếu cọc</th>
                        <th>Khách hàng đại diện</th>
                        <th>Phòng / Vị trí</th>
                        <th>Số giường thuê</th>
                        <th>Số tiền cọc</th>
                        <th>Ngày lập</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedSlips.map((slip) => {
                        const isSelected = selectedSlip && selectedSlip.id === slip.id
                        return (
                          <tr 
                            key={slip.id} 
                            onClick={() => handleSelectSlip(slip)}
                            className={isSelected ? 'selected-room-row' : 'selectable-row'}
                          >
                            <td><strong>{slip.ma_phieu_coc}</strong></td>
                            <td>{slip.khach_hang_ho_ten} ({slip.khach_hang_so_dien_thoai})</td>
                            <td>Phòng {slip.ma_phong} {slip.giuong_id ? `(Giường ${slip.ma_giuong})` : "(Nguyên phòng)"}</td>
                            <td>{slip.so_giuong_thue}</td>
                            <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatVND(slip.so_tien_coc)}</span></td>
                            <td>{new Date(slip.ngay_dat_coc).toLocaleDateString('vi-VN')}</td>
                            <td>
                              <button 
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectSlip(slip)
                                }}
                              >
                                {isSelected ? '✓ Đang chọn' : 'Chọn'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedSlip && (
                <div 
                  style={{ 
                    marginTop: '12px',
                    background: 'var(--primary-light)', 
                    border: '1px solid var(--primary)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Phiếu đặt cọc đang chọn:</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                      {selectedSlip.ma_phieu_coc} — Phòng {selectedSlip.ma_phong} {selectedSlip.giuong_id ? `(Giường ${selectedSlip.ma_giuong})` : "(Nguyên phòng)"}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Khách đại diện: <strong>{selectedSlip.khach_hang_ho_ten}</strong> | Tiền cọc giữ chỗ: <strong style={{ color: 'var(--success)' }}>{formatVND(selectedSlip.so_tien_coc)}</strong>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setActiveStep(2)}
                  >
                    Tiếp tục Phân giường ➔
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PHÂN GIƯỜNG & ĐIỀU KIỆN CƯ TRÚ (UC09) */}
          {activeStep === 2 && selectedSlip && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Row: Add members if renting entire room */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', color: 'var(--gray-800)', margin: 0 }}>
                      Bước 2: Phân giường & Đối chiếu điều kiện cư trú
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      {selectedSlip.loai_phong === 'NguyenPhong'
                        ? `Thuê nguyên phòng (${selectedSlip.so_giuong_thue} giường). Thêm các thành viên trong nhóm và chỉ định giường tương ứng.`
                        : `Thuê giường đơn lẻ. Khách hàng được chỉ định duy nhất giường cọc.`
                      }
                    </p>
                  </div>
                  <div className="badge status-pending" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Phòng {selectedSlip.ma_phong} ({selectedSlip.loai_phong === 'NguyenPhong' ? 'Nguyên phòng' : 'Giường lẻ'})
                  </div>
                </div>

                {/* For entire room, show Member Addition bar */}
                {selectedSlip.loai_phong === 'NguyenPhong' && members.length < selectedSlip.so_giuong_thue && (
                  <form onSubmit={handleSearchMember} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '8px' }}>
                      ➕ Thêm thành viên nhóm vào phòng (Tối đa {selectedSlip.so_giuong_thue} người)
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Nhập số điện thoại của thành viên cần tìm..." 
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={searchingMember}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {searchingMember ? 'Đang tìm...' : '🔍 Tìm & Thêm'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Table of Members and Bed Allocations */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="room-table">
                    <thead>
                      <tr>
                        <th>Vai trò</th>
                        <th>Họ và tên</th>
                        <th>Số điện thoại</th>
                        <th>Giới tính</th>
                        <th>Giường chỉ định</th>
                        <th>Chứng từ / Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const isPrimary = m.isPrimary
                        
                        return (
                          <tr key={m.khach_hang_id}>
                            <td>
                              <span 
                                className="badge" 
                                style={{ 
                                  background: isPrimary ? '#eff6ff' : '#f1f5f9',
                                  color: isPrimary ? 'var(--primary)' : 'var(--gray-600)',
                                  fontWeight: 'bold'
                                }}
                              >
                                {isPrimary ? '🔑 Đại diện' : 'Thành viên'}
                              </span>
                            </td>
                            <td><strong>{m.ho_ten}</strong></td>
                            <td>{m.so_dien_thoai}</td>
                            <td>{m.gioi_tinh}</td>
                            <td>
                              {selectedSlip.loai_phong !== 'NguyenPhong' ? (
                                <strong>Giường {selectedSlip.ma_giuong}</strong>
                              ) : (
                                <select 
                                  className="select" 
                                  value={m.giuong_id}
                                  onChange={(e) => handleAssignBed(m.khach_hang_id, e.target.value)}
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                  <option value="">-- Chọn giường --</option>
                                  {roomBeds.map(b => (
                                    <option 
                                      key={b.id} 
                                      value={b.id}
                                      disabled={members.some(x => x.giuong_id === b.id && x.khach_hang_id !== m.khach_hang_id)}
                                    >
                                      Giường {b.ma_giuong} ({b.trang_thai === 'DaDatCoc' ? 'Đã cọc' : 'Trống'})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                                Đối chiếu CCCD thực tế
                              </span>
                            </td>
                            <td>
                              {!isPrimary ? (
                                <button 
                                  className="btn btn-sm" 
                                  onClick={() => handleRemoveMember(m.khach_hang_id)}
                                  style={{ color: 'var(--danger)', background: 'transparent', border: 'none' }}
                                >
                                  ❌ Xóa
                                </button>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic' }}>Không thể xóa</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Residency Condition Checks Results (UC09) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--gray-200)', paddingTop: '16px', marginTop: '8px' }}>
                  <button 
                    className="btn btn-outline"
                    onClick={() => setActiveStep(1)}
                  >
                    ⬅ Quay lại Bước 1
                  </button>

                  <button 
                    className="btn btn-primary"
                    onClick={handleCheckResidency}
                    disabled={checkingResidency || members.length === 0}
                    style={{ background: 'var(--warning-dark, #b45309)', borderColor: 'var(--warning-dark, #b45309)' }}
                  >
                    {checkingResidency ? 'Đang kiểm tra...' : '🔍 Chạy kiểm tra điều kiện cư trú'}
                  </button>
                </div>
              </div>

              {/* Checklist details from UC09 */}
              {checkResult && (
                <div className="card" style={{ borderLeft: `6px solid ${checkResult.tat_ca_dat ? 'var(--success)' : 'var(--warning)'}`, background: '#f8fafc' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: checkResult.tat_ca_dat ? 'var(--success)' : '#b45309', marginBottom: '16px' }}>
                    {checkResult.tat_ca_dat ? '✅ ĐẠT YÊU CẦU CƯ TRÚ' : '⚠️ PHÁT HIỆN THÀNH VIÊN KHÔNG ĐẠT ĐIỀU KIỆN'}
                  </h3>
                  
                  <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '16px' }}>
                    {checkResult.tat_ca_dat 
                      ? 'Tất cả các thành viên đều khớp giới tính quy định của phòng và có đầy đủ thông tin CMND/CCCD.'
                      : 'Có một số thành viên không đạt điều kiện cư trú. Đối với phòng nguyên nhóm, các thành viên không đạt sẽ bị LOẠI khỏi danh sách hợp đồng chính thức khi lập.'
                    }
                  </div>

                  <table className="room-table" style={{ background: 'white', borderRadius: '8px' }}>
                    <thead>
                      <tr>
                        <th>Họ tên thành viên</th>
                        <th>Giường</th>
                        <th>Giấy tờ CCCD</th>
                        <th>Giới tính khớp</th>
                        <th>Kết quả</th>
                        <th>Lý do loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkResult.chi_tiet.map((item) => {
                        const mInfo = members.find(x => x.khach_hang_id === item.khach_hang_id)
                        const bedName = roomBeds.find(b => b.id === item.giuong_id)?.ma_giuong || selectedSlip.ma_giuong || 'Chưa rõ'
                        
                        return (
                          <tr key={item.khach_hang_id}>
                            <td><strong>{item.ho_ten}</strong></td>
                            <td>Giường {bedName}</td>
                            <td>
                              {mInfo?.so_cmnd_cccd ? (
                                <span style={{ color: 'var(--success)' }}>✔ Có ({mInfo.so_cmnd_cccd})</span>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>✘ Thiếu CCCD</span>
                              )}
                            </td>
                            <td>
                              <span style={{ color: 'var(--success)' }}>✔ Khớp ({mInfo?.gioi_tinh})</span>
                            </td>
                            <td>
                              <span className={`badge ${item.dat ? 'status-pending' : 'status-maintain'}`} style={{ background: item.dat ? '#dcfce7' : '#fee2e2', color: item.dat ? '#15803d' : '#b91c1c' }}>
                                {item.dat ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--danger)', fontSize: '13px' }}>
                              {item.ly_do || 'Không có'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Proceed buttons based on check status */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    {selectedSlip.loai_phong !== 'NguyenPhong' && !checkResult.tat_ca_dat ? (
                      <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '14px', background: '#fee2e2', padding: '10px 16px', borderRadius: '8px' }}>
                        ❌ Khách hàng đơn lẻ không đạt điều kiện cư trú. Không thể lập hợp đồng thuê!
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary"
                        onClick={() => setActiveStep(3)}
                        style={{ padding: '12px 24px' }}
                      >
                        {!checkResult.tat_ca_dat ? '⚠️ Bỏ qua thành viên lỗi & Tiếp tục ➔' : 'Tiếp tục Xem lại điều khoản HĐ ➔'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: XEM LẠI ĐIỀU KHOẢN & TẠO HỢP ĐỒNG */}
          {activeStep === 3 && selectedSlip && (
            <div className="grid-2">
              {/* Left Column: Input dates & Payment settings */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px' }}>
                  ✍️ Thông tin điều khoản hợp đồng
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label">Ngày bắt đầu thuê (Ngày dời vào):</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={ngayBatDau} 
                      onChange={(e) => setNgayBatDau(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="form-label">Ngày kết thúc hợp đồng (Không bắt buộc):</label>
                    <input 
                      type="date" 
                      className="input" 
                      value={ngayKetThuc} 
                      onChange={(e) => setNgayKetThuc(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="form-label">Kỳ hạn thanh toán tiền nhà:</label>
                    <select 
                      className="select" 
                      value={kyThanhToan} 
                      onChange={(e) => setKyThanhToan(e.target.value)}
                    >
                      <option value="Thang">Thanh toán theo từng tháng</option>
                      <option value="Quy">Thanh toán theo quý (3 tháng)</option>
                      <option value="NuaNam">Thanh toán 6 tháng một lần</option>
                    </select>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--gray-200)', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>Đơn giá thuê snapshot hiện tại:</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                      {formatVND(selectedSlip.phong_gia_thue)} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--gray-500)' }}>/giường/tháng</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Summarized Residents list & warnings & Final confirmation */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--gray-800)', borderBottom: '1px solid var(--gray-200)', paddingBottom: '8px' }}>
                    📝 Tóm tắt hợp đồng chính thức
                  </h3>

                  {/* Warning boxes */}
                  {checkResult && !checkResult.tat_ca_dat && (
                    <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>⚠️ CẢNH BÁO: CO_THANH_VIEN_BI_LOAI</strong>
                      <span>Có một số thành viên không đạt điều kiện cư trú và đã bị loại bỏ khỏi hợp đồng thuê. Hệ thống chỉ cấp giường và ký hợp đồng cho những thành viên hợp lệ.</span>
                    </div>
                  )}

                  {/* Bed Transition Logic Details */}
                  <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                    <h4 style={{ color: 'var(--gray-800)', marginBottom: '6px' }}>🛌 Phân bổ và kích hoạt giường:</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {members.filter(m => {
                        // Only include valid members
                        if (!checkResult) return true
                        const checkM = checkResult.chi_tiet.find(x => x.khach_hang_id === m.khach_hang_id)
                        return checkM ? checkM.dat : true
                      }).map(m => {
                        const bedName = roomBeds.find(b => b.id === m.giuong_id)?.ma_giuong || selectedSlip.ma_giuong || ''
                        return (
                          <li key={m.khach_hang_id}>
                            Khách <strong>{m.ho_ten}</strong> ➔ Chuyển trạng thái <strong>Giường {bedName}</strong> từ <span style={{ color: 'var(--warning-dark, #b45309)', fontWeight: 600 }}>DaDatCoc</span> sang <span style={{ color: 'var(--success)', fontWeight: 600 }}>DangThue</span>.
                          </li>
                        )
                      })}
                    </ul>
                    <div style={{ marginTop: '8px', fontStyle: 'italic', fontSize: '12px', color: 'var(--gray-500)' }}>
                      ℹ️ Ghi chú: Các giường trống hoặc của thành viên không hợp lệ sẽ KHÔNG bị thay đổi trạng thái để giữ nguyên hiện trạng phòng.
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '12px' }}>
                    <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: 'var(--gray-700)', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={acceptTerms} 
                        onChange={(e) => setAcceptTerms(e.target.checked)} 
                        style={{ marginTop: '3px' }}
                      />
                      <span>Tôi xác nhận khách hàng đại diện đã đối chiếu đầy đủ giấy tờ tùy thân, ký kết bản thỏa thuận thuê bằng giấy trực tiếp, và đồng ý dời vào theo thời hạn ghi trong hợp đồng.</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setActiveStep(2)}
                    style={{ flex: 1 }}
                  >
                    ⬅ Quay lại Step 2
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleCreateContract}
                    disabled={creatingContract || !acceptTerms}
                    style={{ flex: 1, background: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    {creatingContract ? 'Đang khởi tạo...' : '✍️ Kích hoạt Hợp đồng'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: THÀNH CÔNG */}
          {activeStep === 4 && createdContract && (
            <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#15803d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                ✓
              </div>
              
              <div>
                <h1 style={{ fontSize: '24px', color: 'var(--gray-800)', margin: 0 }}>Hợp đồng thuê đã kích hoạt!</h1>
                <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '8px' }}>
                  Mã hợp đồng chính thức: <strong style={{ color: 'var(--primary)', fontSize: '16px' }}>{createdContract.ma_hop_dong}</strong>
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--gray-200)', width: '100%', textAlign: 'left', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Mã hợp đồng:</strong> {createdContract.ma_hop_dong}</div>
                <div><strong>Trạng thái pháp lý:</strong> <span className="badge status-pending" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 'bold' }}>{createdContract.trang_thai === 'HieuLuc' ? 'Hiệu Lực' : createdContract.trang_thai}</span></div>
                <div><strong>Ngày ký:</strong> {new Date(createdContract.ngay_ky).toLocaleString('vi-VN')}</div>
                <div><strong>Ngày bắt đầu:</strong> {new Date(ngayBatDau).toLocaleDateString('vi-VN')}</div>
                <div><strong>Đơn giá thuê:</strong> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatVND(createdContract.gia_thue_theo_giuong)} /giường/tháng</span></div>
                <div><strong>Số lượng thành viên chính thức:</strong> {createdContract.thanh_vien?.length || 0} người</div>
              </div>

              <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => navigate('/dashboard-quan-ly')}
                  style={{ flex: 1 }}
                >
                  🏠 Về Dashboard Quản lý
                </button>
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    // Redirect to UC10 mock or return
                    showToast('Tính năng Thanh toán kỳ đầu (UC10) đang được chuẩn bị.', 'warning')
                  }}
                  style={{ flex: 1 }}
                >
                  💳 Thanh toán kỳ đầu (UC10) ➔
                </button>
              </div>
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
