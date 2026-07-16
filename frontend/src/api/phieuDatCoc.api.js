import axiosClient from './axiosClient'

export const createPhieuDatCoc = (data) => {
  return axiosClient.post('/phieu-dat-coc', data)
}

export const getPhieuChoXuLy = () => {
  return axiosClient.get('/phieu-dat-coc', { params: { trang_thai: 'ChoThanhToan' } })
}

export const getPhieuDatCocById = (id) => {
  return axiosClient.get(`/phieu-dat-coc/${id}`)
}

export const xacNhanPhieu = (id, data) => {
  return axiosClient.patch(`/phieu-dat-coc/${id}/xac-nhan`, data)
}
