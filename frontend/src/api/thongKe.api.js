import axiosClient from './axiosClient'

export const getThongKeSale    = () => axiosClient.get('/thong-ke/sale')
export const getThongKeQuanLy  = () => axiosClient.get('/thong-ke/quan-ly')
export const getThongKeKeToan  = () => axiosClient.get('/thong-ke/ke-toan')
