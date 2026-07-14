import { useState, useEffect } from 'react'
import { searchPhong, getGiuongTrong } from '../../api/phong.api'

export default function TraCuuPhong({ 
  mode = 'browse', 
  onSelectPhong, 
  onSelectGiuong,
  selectedPhongId,
  selectedGiuongId 
}) {
  // Bộ lọc tìm kiếm
  const [filters, setFilters] = useState({
    khu_vuc: '',
    loai_phong: '',
    gia_den: '',
    trang_thai: mode === 'select' ? 'Trong' : '' // Nếu chọn phòng thì mặc định chỉ tìm phòng 'Trong'
  })

  const [rooms, setRooms] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // State giường của phòng đang được chọn (chỉ dùng trong mode 'select')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [beds, setBeds] = useState([])
  const [loadingBeds, setLoadingBeds] = useState(false)
  const [activeGiuongId, setActiveGiuongId] = useState(selectedGiuongId || null)

  // Fetch danh sách phòng
  const fetchRooms = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await searchPhong({
        ...filters,
        gia_den: filters.gia_den ? Number(filters.gia_den) : undefined,
        page,
        pageSize
      })
      if (res.success) {
        setRooms(res.data || [])
        setTotal(res.meta?.total || 0)
      } else {
        setError(res.error?.message || 'Không thể lấy dữ liệu phòng.')
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
    // Reset lựa chọn phòng/giường khi thay đổi bộ lọc
    if (mode === 'select') {
      setSelectedRoom(null)
      setBeds([])
    }
  }, [filters, page])

  // Lấy danh sách giường khi chọn phòng
  const handleSelectRoom = async (room) => {
    if (mode !== 'select') return

    setSelectedRoom(room)
    if (onSelectPhong) {
      onSelectPhong(room)
    }

    // Nếu phòng thuê nguyên phòng (NguyenPhong), không cần chọn giường lẻ
    if (room.loai_phong === 'NguyenPhong') {
      setBeds([])
      if (onSelectGiuong) {
        onSelectGiuong(null, room) // Trả về giuong null cho nguyên phòng
      }
      return
    }

    // Load giường trống của phòng
    setLoadingBeds(true)
    try {
      const res = await getGiuongTrong(room.id)
      if (res.success) {
        setBeds(res.data)
      } else {
        alert(res.error?.message || 'Không thể lấy danh sách giường.')
      }
    } catch (err) {
      alert('Lỗi tải danh sách giường.')
    } finally {
      setLoadingBeds(false)
    }
  }

  const handleSelectBed = (bed) => {
    setActiveGiuongId(bed.id)
    if (onSelectGiuong) {
      onSelectGiuong(bed, selectedRoom)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Trong':
        return <span className="badge status-empty">Trống</span>
      case 'ChoDatCoc':
        return <span className="badge status-pending">Chờ đặt cọc</span>
      case 'DaDatCoc':
        return <span className="badge status-deposit">Đã đặt cọc</span>
      case 'DangThue':
        return <span className="badge status-renting">Đang thuê</span>
      case 'BaoTri':
        return <span className="badge status-maintain">Bảo trì</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  const translateRoomType = (type) => {
    if (type === 'Don') return 'Phòng Đơn'
    if (type === 'Ghep') return 'Phòng Ghép'
    if (type === 'NguyenPhong') return 'Nguyên Phòng'
    return type
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {/* Bộ lọc */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <label>Khu vực</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ví dụ: Khu A" 
              value={filters.khu_vuc}
              onChange={(e) => {
                setFilters({ ...filters, khu_vuc: e.target.value })
                setPage(1)
              }}
            />
          </div>

          <div className="filter-group">
            <label>Loại phòng</label>
            <select 
              className="select"
              value={filters.loai_phong}
              onChange={(e) => {
                setFilters({ ...filters, loai_phong: e.target.value })
                setPage(1)
              }}
            >
              <option value="">Tất cả loại phòng</option>
              <option value="Don">Phòng Đơn</option>
              <option value="Ghep">Phòng Ghép</option>
              <option value="NguyenPhong">Nguyên Phòng</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Giá tối đa</label>
            <input 
              type="number" 
              className="input" 
              placeholder="Nhập giá thuê tối đa"
              value={filters.gia_den}
              onChange={(e) => {
                setFilters({ ...filters, gia_den: e.target.value })
                setPage(1)
              }}
            />
          </div>

          {mode === 'browse' && (
            <div className="filter-group">
              <label>Trạng thái</label>
              <select 
                className="select"
                value={filters.trang_thai}
                onChange={(e) => {
                  setFilters({ ...filters, trang_thai: e.target.value })
                  setPage(1)
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Trong">Trống</option>
                <option value="ChoDatCoc">Chờ đặt cọc</option>
                <option value="DaDatCoc">Đã đặt cọc</option>
                <option value="DangThue">Đang thuê</option>
                <option value="BaoTri">Bảo trì</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách phòng */}
      <div className="card" style={{ overflowX: 'auto', marginBottom: '24px' }}>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontWeight: 600 }}>{error}</div>}
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>Đang tìm kiếm phòng...</div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>Không tìm thấy phòng phù hợp.</div>
        ) : (
          <>
            <table className="room-table">
              <thead>
                <tr>
                  <th>Mã phòng</th>
                  <th>Loại phòng</th>
                  <th>Sức chứa</th>
                  <th>Giá thuê / Giường</th>
                  <th>Khu vực</th>
                  <th>Giới tính</th>
                  <th>Số giường trống</th>
                  <th>Trạng thái</th>
                  {mode === 'select' && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const isSelected = selectedRoom?.id === room.id || selectedPhongId === room.id
                  return (
                    <tr 
                      key={room.id} 
                      className={`${mode === 'select' ? 'selectable-row' : ''} ${isSelected ? 'selected-room-row' : ''}`}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <td><strong>{room.ma_phong}</strong></td>
                      <td>{translateRoomType(room.loai_phong)}</td>
                      <td>{room.suc_chua_toi_da} người</td>
                      <td>{formatCurrency(room.gia_thue_mot_giuong)}</td>
                      <td>{room.khu_vuc || 'N/A'}</td>
                      <td>{room.gioi_tinh_quy_dinh || 'Không giới hạn'}</td>
                      <td>{room.so_giuong_trong} giường</td>
                      <td>{getStatusBadge(room.trang_thai)}</td>
                      {mode === 'select' && (
                        <td>
                          <button 
                            className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-primary'}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectRoom(room)
                            }}
                          >
                            {isSelected ? 'Đang chọn' : 'Chọn'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="page-actions" style={{ marginTop: '20px' }}>
                <button 
                  className="btn btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ◀ Trước
                </button>
                <span style={{ alignSelf: 'center', margin: '0 16px', fontWeight: 600, color: 'var(--gray-600)' }}>
                  Trang {page} / {totalPages}
                </span>
                <button 
                  className="btn btn-sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Sau ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lựa chọn giường (chỉ hiển thị trong mode 'select' khi có phòng ghép/đơn được chọn) */}
      {mode === 'select' && selectedRoom && selectedRoom.loai_phong !== 'NguyenPhong' && (
        <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--gray-800)' }}>
            Chọn giường trống của phòng <strong>{selectedRoom.ma_phong}</strong>:
          </h4>
          
          {loadingBeds ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-500)' }}>Đang tải danh sách giường...</div>
          ) : beds.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--danger)', fontWeight: 600 }}>Không có giường trống nào trong phòng này.</div>
          ) : (
            <div className="bed-selector">
              {beds.map((bed) => {
                const isBedSelected = activeGiuongId === bed.id || selectedGiuongId === bed.id
                const isOccupied = bed.trang_thai !== 'Trong'
                
                return (
                  <div 
                    key={bed.id}
                    className={`bed-item ${isBedSelected ? 'selected' : ''} ${isOccupied ? 'disabled' : ''}`}
                    onClick={() => !isOccupied && handleSelectBed(bed)}
                  >
                    🛏️ {bed.ma_giuong}
                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                      {isOccupied ? 'Hết chỗ' : 'Còn trống'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
