import axiosClient from './axiosClient'

export const taoBienBan = (data) => {
  return axiosClient.post('/bien-ban-ban-giao', data)
}

export const capNhatDanhSachTaiSan = (id, danhSach) => {
  return axiosClient.patch(`/bien-ban-ban-giao/${id}/danh-sach-tai-san`, {
    danh_sach_tai_san: danhSach
  })
}

export const xacNhanBanGiao = (id, anhUrl) => {
  return axiosClient.patch(`/bien-ban-ban-giao/${id}/xac-nhan`, {
    anh_bien_ban_url: anhUrl ?? null
  })
}

export const getBienBanByHopDong = (hopDongId) => {
  return axiosClient.get('/bien-ban-ban-giao', { params: { hop_dong_id: hopDongId } })
}

export const getTaiSanPhong = (phongId) => {
  return axiosClient.get('/tai-san-phong', { params: { phong_id: phongId } })
}
