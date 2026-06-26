import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import DangNhap from './pages/DangNhap'
import DashboardSale from './pages/sale/DashboardSale'
import TiepNhanYeuCau from './pages/sale/TiepNhanYeuCau'
import DatLichXemPhong from './pages/sale/DatLichXemPhong'
import LapPhieuDatCoc from './pages/sale/LapPhieuDatCoc'
import DashboardQuanLy from './pages/quanly/DashboardQuanLy'
import GhiNhanDatCoc from './pages/quanly/GhiNhanDatCoc'
import LapHopDong from './pages/quanly/LapHopDong'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Đang tải...</div>
  if (!user) return <Navigate to="/dang-nhap" replace />
  if (allowedRoles && !allowedRoles.includes(user.vai_tro)) {
    return <Navigate to="/dang-nhap" replace />
  }
  return children
}

const getDashboardPath = (role) => {
  if (!role) return '/dang-nhap'
  const r = role.toLowerCase()
  if (r === 'sale') return '/dashboard-sale'
  if (r === 'quanly' || r === 'quản lý') return '/dashboard-quan-ly'
  if (r === 'ketoan' || r === 'kế toán') return '/dashboard-ke-toan'
  return `/dashboard-${r}`
}

// Global layout wrapper for app pages is handled internally in each page (Sidebar + Header + content)
function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/dang-nhap" element={
        user ? <Navigate to={getDashboardPath(user.vai_tro)} replace /> : <DangNhap />
      } />

      {/* Sale routes */}
      <Route path="/dashboard-sale" element={
        <ProtectedRoute allowedRoles={['Sale']}><DashboardSale /></ProtectedRoute>
      } />
      <Route path="/tiep-nhan-yeu-cau" element={
        <ProtectedRoute allowedRoles={['Sale']}><TiepNhanYeuCau /></ProtectedRoute>
      } />
      <Route path="/dat-lich-xem-phong/:nhuCauThueId" element={
        <ProtectedRoute allowedRoles={['Sale']}><DatLichXemPhong /></ProtectedRoute>
      } />
      <Route path="/lap-phieu-dat-coc" element={
        <ProtectedRoute allowedRoles={['Sale']}><LapPhieuDatCoc /></ProtectedRoute>
      } />

      {/* Shared routes (Sale and QuanLy) */}
      <Route path="/ghi-nhan-dat-coc" element={
        <ProtectedRoute allowedRoles={['Sale', 'QuanLy', 'quản lý', 'Quản lý']}><GhiNhanDatCoc /></ProtectedRoute>
      } />

      {/* Manager (QuanLy) routes */}
      <Route path="/dashboard-quan-ly" element={
        <ProtectedRoute allowedRoles={['QuanLy', 'quản lý', 'Quản lý']}><DashboardQuanLy /></ProtectedRoute>
      } />
      <Route path="/lap-hop-dong" element={
        <ProtectedRoute allowedRoles={['QuanLy', 'quản lý', 'Quản lý']}><LapHopDong /></ProtectedRoute>
      } />

      {/* Fallbacks */}
      <Route path="/dashboard-ke-toan" element={
        <ProtectedRoute allowedRoles={['KeToan']}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Dashboard Kế Toán</h2>
            <p>Trang này hiện đang được phát triển.</p>
            <button className="btn btn-primary" onClick={() => window.location.href='/dang-nhap'}>Quay lại</button>
          </div>
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/dang-nhap" replace />} />
      <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
