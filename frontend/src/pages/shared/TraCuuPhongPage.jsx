import Sidebar from '../../components/shared/Sidebar'
import Header from '../../components/shared/Header'
import TraCuuPhong from '../../components/shared/TraCuuPhong'

export default function TraCuuPhongPage() {
  return (
    <div className="layout">
      <Sidebar />
      
      <div className="main">
        <Header title="Tra cứu Trạng thái Phòng & Giường" />
        
        <div className="content">
          <div className="page-header">
            <h1 className="page-title">Tra cứu Phòng & Giường</h1>
            <p className="page-subtitle">
              Tìm kiếm và kiểm tra tình trạng phòng trống, thông tin giá thuê, sức chứa, và trạng thái hiện tại của từng phòng/giường.
            </p>
          </div>

          <TraCuuPhong mode="browse" />
        </div>
      </div>
    </div>
  )
}
