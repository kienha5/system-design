import axiosClient from './axiosClient'

export const searchPhong = (filters) => {
  // Loại bỏ các trường rỗng hoặc undefined khỏi query params
  const params = {}
  Object.keys(filters).forEach(key => {
    if (filters[key] !== '' && filters[key] !== undefined && filters[key] !== null) {
      params[key] = filters[key]
    }
  })

  // Mặc định phân trang nếu chưa truyền
  if (!params.page) params.page = 1
  if (!params.pageSize) params.pageSize = 10

  return axiosClient.get('/phong', { params })
}

export const getGiuongTrong = (phongId) => {
  return axiosClient.get('/giuong', {
    params: { phong_id: phongId, trang_thai: 'Trong' }
  })
}

export const getAllGiuong = (phongId) => {
  return axiosClient.get('/giuong', {
    params: { phong_id: phongId }
  })
}

export const updateRoomStatus = (phongId, data) => {
  return axiosClient.patch(`/phong/${phongId}/trang-thai`, data)
}

export const updateBedStatus = (giuongId, data) => {
  return axiosClient.patch(`/giuong/${giuongId}/trang-thai`, data)
}

