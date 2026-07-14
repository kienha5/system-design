export const FIELD_NAME_MAP = {
  // Khách hàng
  'ho_ten': 'Họ tên',
  'so_dien_thoai': 'Số điện thoại',
  'email': 'Email',
  'gioi_tinh': 'Giới tính',
  'quoc_tich': 'Quốc tịch',
  'so_cmnd_cccd': 'Số CMND/CCCD',

  // Yêu cầu thuê
  'so_nguoi': 'Số người',
  'khu_vuc_yeu_cau': 'Khu vực mong muốn',
  'loai_phong_yeu_cau': 'Loại phòng',
  'muc_gia_toi_da': 'Mức giá tối đa',
  'thoi_gian_vao_o_du_kien': 'Ngày dự kiến vào ở',
  'thoi_han_thue_du_kien': 'Thời hạn thuê (tháng)',
  'phuong_thuc_thong_bao': 'Phương thức thông báo',
  'ghi_chu_yeu_cau': 'Ghi chú yêu cầu',

  // Phiếu đặt cọc
  'phong_id': 'Phòng',
  'giuong_id': 'Giường',
  'so_giuong_thue': 'Số giường thuê',
  'chi_nhanh_id': 'Chi nhánh',

  // Hợp đồng
  'phieu_dat_coc_id': 'Phiếu giữ phòng',
  'ngay_bat_dau': 'Ngày bắt đầu',
  'ngay_ket_thuc': 'Ngày kết thúc',
  'thanh_vien': 'Danh sách thành viên',

  // Hóa đơn
  'hop_dong_id': 'Hợp đồng',
  'tien_dien': 'Tiền điện',
  'tien_nuoc': 'Tiền nước',
  'hinh_thuc_thanh_toan': 'Hình thức thanh toán',

  // Biên bản
  'danh_sach_tai_san': 'Danh sách tài sản',
  'danh_sach_doi_soat': 'Danh sách đối soát',
  'ngay_tra_thuc_te': 'Ngày trả thực tế',
  'ty_le_hoan_coc': 'Tỷ lệ hoàn cọc',
  'tai_chinh_da_hoan_tat': 'Xác nhận tài chính',

  // Chung
  'ngay_tra_phong_du_kien': 'Ngày trả phòng dự kiến',
  'lich_hen_xem': 'Lịch hẹn xem phòng',
}

// Hàm parse lỗi từ backend → object { fieldName: message }
export function parseValidationErrors(errorResponse) {
  const errors = {}

  if (!errorResponse) return errors

  // Case 1: Zod validation array
  if (Array.isArray(errorResponse.details)) {
    errorResponse.details.forEach(e => {
      const fieldKey = e.field || e.path?.[0]
      const fieldName = FIELD_NAME_MAP[fieldKey] || fieldKey
      errors[fieldKey] = `${fieldName} ${e.message}`
    })
    return errors
  }

  // Case 2: Message string với tên field (ví dụ trả về từ Express validate middleware của chúng ta)
  if (typeof errorResponse.message === 'string') {
    const errorStrings = errorResponse.message.split(', ')
    errorStrings.forEach(str => {
      const parts = str.split(': ')
      if (parts.length >= 2) {
        const fullFieldKey = parts[0] // ví dụ: "khach_hang.so_dien_thoai" hoặc "so_nguoi"
        // Lấy phần cuối của field path hoặc map trực tiếp
        const fieldKey = fullFieldKey.includes('.') ? fullFieldKey.split('.').pop() : fullFieldKey
        const fieldName = FIELD_NAME_MAP[fieldKey] || fieldKey
        let displayMsg = parts.slice(1).join(': ')
        
        // Translate common validation terms to Vietnamese
        displayMsg = displayMsg
          .replace(/invalid/gi, 'không hợp lệ')
          .replace(/required/gi, 'bắt buộc')
          .replace(/must be/gi, 'phải là')
          .replace(/is not/gi, 'không phải')
        
        errors[fieldKey] = `${fieldName} ${displayMsg}`
      }
    })
    
    // Lưu thông điệp tổng quát
    let msg = errorResponse.message
    Object.entries(FIELD_NAME_MAP).forEach(([key, value]) => {
      msg = msg.replace(new RegExp(key, 'g'), value)
    })
    msg = msg
      .replace(/invalid/gi, 'không hợp lệ')
      .replace(/required/gi, 'bắt buộc')
      .replace(/must be/gi, 'phải là')
      .replace(/is not/gi, 'không phải')
    errors['_general'] = msg
  }

  return errors
}
