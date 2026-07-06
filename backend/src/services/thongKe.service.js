import sql from '../db.js'

// Thống kê cho Dashboard Sale
export async function thongKeSale(saleId) {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const [
    yeuCauMoi,
    lichXemHomNay,
    phieuChoXuLy,
    phieuSapHetHan
  ] = await Promise.all([

    // Yêu cầu thuê mới tạo hôm nay (tất cả Sale thấy, không chỉ của mình)
    sql`
      SELECT COUNT(*) as count FROM nhu_cau_thue
      WHERE DATE(created_at) = ${today}
        AND trang_thai NOT IN ('DaHuy', 'ChuyenDatCoc')
    `,

    // Lịch xem phòng hôm nay
    sql`
      SELECT COUNT(*) as count FROM nhu_cau_thue
      WHERE DATE(lich_hen_xem) = ${today}
        AND trang_thai = 'DaDatLichXem'
    `,

    // Phiếu giữ phòng chờ xác nhận thanh toán
    sql`
      SELECT COUNT(*) as count FROM phieu_dat_coc
      WHERE trang_thai = 'ChoThanhToan'
        AND han_thanh_toan > now()
    `,

    // Phiếu sắp hết hạn trong 2 giờ tới
    sql`
      SELECT COUNT(*) as count FROM phieu_dat_coc
      WHERE trang_thai = 'ChoThanhToan'
        AND han_thanh_toan > now()
        AND han_thanh_toan < now() + interval '2 hours'
    `
  ])

  return {
    yeu_cau_moi: parseInt(yeuCauMoi[0].count),
    lich_xem_hom_nay: parseInt(lichXemHomNay[0].count),
    phieu_cho_xu_ly: parseInt(phieuChoXuLy[0].count),
    phieu_sap_het_han: parseInt(phieuSapHetHan[0].count)
  }
}

// Thống kê cho Dashboard Quản lý
export async function thongKeQuanLy() {
  const [
    hopDongHieuLuc,
    phieuChoXacNhan,
    hopDongSapHetHan,
    phongDangThue
  ] = await Promise.all([

    // Hợp đồng đang hiệu lực
    sql`SELECT COUNT(*) as count FROM hop_dong WHERE trang_thai = 'HieuLuc'`,

    // Phiếu giữ phòng có chứng từ, chờ Quản lý xác nhận
    sql`
      SELECT COUNT(*) as count FROM phieu_dat_coc
      WHERE trang_thai = 'ChoThanhToan'
        AND chung_tu_url IS NOT NULL
        AND han_thanh_toan > now()
    `,

    // Hợp đồng hết hạn trong 30 ngày tới
    sql`
      SELECT COUNT(*) as count FROM hop_dong
      WHERE trang_thai = 'HieuLuc'
        AND ngay_ket_thuc IS NOT NULL
        AND ngay_ket_thuc <= CURRENT_DATE + interval '30 days'
    `,

    // Phòng đang có người ở
    sql`SELECT COUNT(*) as count FROM phong WHERE trang_thai = 'DangThue'`
  ])

  return {
    hop_dong_hieu_luc: parseInt(hopDongHieuLuc[0].count),
    phieu_cho_xac_nhan: parseInt(phieuChoXacNhan[0].count),
    hop_dong_sap_het_han: parseInt(hopDongSapHetHan[0].count),
    phong_dang_thue: parseInt(phongDangThue[0].count)
  }
}

// Thống kê cho Dashboard Kế toán
export async function thongKeKeToan() {
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [
    hoaDonChoThanhToan,
    hoaDonThangNay,
    doanhThuThangNay,
    bienBanChoKhauTru
  ] = await Promise.all([

    // Hóa đơn chưa thanh toán
    sql`SELECT COUNT(*) as count FROM hoa_don WHERE trang_thai = 'ChoThanhToan'`,

    // Hóa đơn đã thu tháng này
    sql`
      SELECT COUNT(*) as count FROM hoa_don
      WHERE trang_thai = 'DaThanhToan'
        AND ky_thanh_toan = ${thisMonth}
    `,

    // Tổng doanh thu tháng này
    sql`
      SELECT COALESCE(SUM(tong_tien), 0) as total FROM hoa_don
      WHERE trang_thai = 'DaThanhToan'
        AND ky_thanh_toan = ${thisMonth}
    `,

    // Biên bản trả phòng chờ tính hoàn cọc
    sql`
      SELECT COUNT(*) as count FROM bien_ban_tra_phong
      WHERE trang_thai = 'ChoXacNhan'
        AND ke_toan_xac_nhan_id IS NULL
    `
  ])

  return {
    hoa_don_cho_thanh_toan: parseInt(hoaDonChoThanhToan[0].count),
    hoa_don_thang_nay: parseInt(hoaDonThangNay[0].count),
    doanh_thu_thang_nay: parseFloat(doanhThuThangNay[0].total),
    bien_ban_cho_khau_tru: parseInt(bienBanChoKhauTru[0].count)
  }
}
