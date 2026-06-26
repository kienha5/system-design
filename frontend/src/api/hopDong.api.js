import axiosClient from './axiosClient'

export const createHopDong = (data) => {
  return axiosClient.post('/hop-dong', data)
}

export const getHopDong = (id) => {
  return axiosClient.get(`/hop-dong/${id}`)
}

export const kiemTraDieuKien = (phieuDatCocId, danhSachKhach) => {
  return axiosClient.post(`/phieu-dat-coc/${phieuDatCocId}/kiem-tra-dieu-kien`, {
    danh_sach_khach: danhSachKhach
  })
}

export const thanhLyHopDong = (id, taiChinhDaHoanTat) => {
  return axiosClient.patch(`/hop-dong/${id}/thanh-ly`, {
    tai_chinh_da_hoan_tat: taiChinhDaHoanTat
  })
}

export const searchHopDong = (query) => {
  return axiosClient.get(`/hop-dong?search=${encodeURIComponent(query)}`)
}
