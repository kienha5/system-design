import axiosClient from './axiosClient'

export const createNhuCauThue = (data) => {
  return axiosClient.post('/nhu-cau-thue', data)
}

export const updatePhongDuKien = (id, phongDuKienId) => {
  return axiosClient.patch(`/nhu-cau-thue/${id}/phong-du-kien`, { 
    phong_du_kien_id: phongDuKienId 
  })
}

export const datLichXem = (id, data) => {
  return axiosClient.patch(`/nhu-cau-thue/${id}/lich-hen`, {
    lich_hen_xem: data.lich_hen_xem,
    phuong_thuc_thong_bao: data.phuong_thuc_thong_bao
  })
}

export const xacNhanDaXem = (id) => {
  return axiosClient.patch(`/nhu-cau-thue/${id}/xac-nhan-da-xem`)
}

export const getNhuCauThue = (id) => {
  return axiosClient.get(`/nhu-cau-thue/${id}`)
}

export const searchNhuCauThueByPhone = (phone) => {
  return axiosClient.get('/nhu-cau-thue', { params: { so_dien_thoai: phone } })
}
