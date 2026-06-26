import axiosClient from './axiosClient'

export const taoHoaDon = (data) => {
  return axiosClient.post('/hoa-don', data)
}

export const xacNhanThanhToan = (id, hinhThuc) => {
  return axiosClient.patch(`/hoa-don/${id}/xac-nhan-thanh-toan`, {
    hinh_thuc_thanh_toan: hinhThuc
  })
}

export const getHoaDon = (id) => {
  return axiosClient.get(`/hoa-don/${id}`)
}

export const getHoaDonByHopDong = (hopDongId) => {
  return axiosClient.get(`/hop-dong/${hopDongId}/hoa-don`)
}
