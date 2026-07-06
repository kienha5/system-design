import axiosClient from './axiosClient'

export const dangKyTraPhong = (data) =>
  axiosClient.post('/bien-ban-tra-phong', data)

export const capNhatNgayHen = (id, ngayDuKien) =>
  axiosClient.patch(`/bien-ban-tra-phong/${id}/ngay-hen`, {
    ngay_tra_phong_du_kien: ngayDuKien
  })

export const doSoatTaiSan = (id, data) =>
  axiosClient.patch(`/bien-ban-tra-phong/${id}/doi-soat`, data)

export const khauTruChiPhi = (id, data) =>
  axiosClient.patch(`/bien-ban-tra-phong/${id}/khau-tru`, data)

export const xacNhanKhach = (id) =>
  axiosClient.patch(`/bien-ban-tra-phong/${id}/xac-nhan-khach`)

export const getBienBanTraPhong = (id) =>
  axiosClient.get(`/bien-ban-tra-phong/${id}`)

export const getGoiYTyLe = (id) =>
  axiosClient.get(`/bien-ban-tra-phong/${id}/goi-y-ty-le`)

