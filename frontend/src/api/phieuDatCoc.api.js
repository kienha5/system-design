import axiosClient from './axiosClient'

export const createPhieuDatCoc = (data) => {
  return axiosClient.post('/phieu-dat-coc', data)
}
