-- ==========================================
-- SQL SCRIPT TẠO CƠ SỞ DỮ LIỆU PHÒNG KÝ TÚC XÁ
-- MÔN HỌC: CSC12004 - THIẾT KẾ HỆ THỐNG THÔNG TIN
-- ĐỐI TƯỢNG: PostgreSQL
-- ==========================================

-- 1. XÓA BẢNG VÀ ENUM CŨ NẾU TỒN TẠI (ĐỂ RESET)
DROP TABLE IF EXISTS lich_su_trang_thai_phong CASCADE;
DROP TABLE IF EXISTS bien_ban_tra_phong CASCADE;
DROP TABLE IF EXISTS bien_ban_ban_giao CASCADE;
DROP TABLE IF EXISTS tai_san_phong CASCADE;
DROP TABLE IF EXISTS hoa_don;
DROP TABLE IF EXISTS thanh_vien_hop_dong CASCADE;
DROP TABLE IF EXISTS hop_dong CASCADE;
DROP TABLE IF EXISTS phieu_dat_coc CASCADE;
DROP TABLE IF EXISTS nhu_cau_thue CASCADE;
DROP TABLE IF EXISTS khach_hang CASCADE;
DROP TABLE IF EXISTS nguoi_dung_he_thong CASCADE;
DROP TABLE IF EXISTS giuong CASCADE;
DROP TABLE IF EXISTS phong CASCADE;
DROP TABLE IF EXISTS chi_nhanh CASCADE;

DROP TYPE IF EXISTS trang_thai_phong CASCADE;
DROP TYPE IF EXISTS trang_thai_giuong CASCADE;
DROP TYPE IF EXISTS loai_phong CASCADE;
DROP TYPE IF EXISTS gioi_tinh CASCADE;
DROP TYPE IF EXISTS trang_thai_yeu_cau_thue CASCADE;
DROP TYPE IF EXISTS trang_thai_phieu_coc CASCADE;
DROP TYPE IF EXISTS trang_thai_hop_dong CASCADE;
DROP TYPE IF EXISTS trang_thai_hoa_don CASCADE;
DROP TYPE IF EXISTS trang_thai_bien_ban_tra CASCADE;
DROP TYPE IF EXISTS phuong_thuc_thanh_toan CASCADE;
DROP TYPE IF EXISTS vai_tro_nguoi_dung CASCADE;

-- 2. TẠO CÁC KIỂU DỮ LIỆU ENUM
CREATE TYPE trang_thai_phong AS ENUM ('Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue', 'BaoTri');
CREATE TYPE trang_thai_giuong AS ENUM ('Trong', 'ChoDatCoc', 'DaDatCoc', 'DangThue');
CREATE TYPE loai_phong AS ENUM ('Don', 'Ghep', 'NguyenPhong');
CREATE TYPE gioi_tinh AS ENUM ('Nam', 'Nu', 'Khac');
CREATE TYPE trang_thai_yeu_cau_thue AS ENUM ('MoiTiepNhan', 'DaDatLichXem', 'DaXemPhong', 'ChuyenDatCoc', 'DaHuy');
CREATE TYPE trang_thai_phieu_coc AS ENUM ('ChoThanhToan', 'DaThanhToan', 'HetHan', 'DaHuy');
CREATE TYPE trang_thai_hop_dong AS ENUM ('HieuLuc', 'DaThanhLy', 'DaHuy');
CREATE TYPE trang_thai_hoa_don AS ENUM ('ChoThanhToan', 'DaThanhToan', 'QuaHan');
CREATE TYPE trang_thai_bien_ban_tra AS ENUM ('ChoDoiSoat', 'ChoXacNhan', 'DaThanhLy');
CREATE TYPE phuong_thuc_thanh_toan AS ENUM ('TienMat', 'ChuyenKhoan');
CREATE TYPE vai_tro_nguoi_dung AS ENUM ('Sale', 'QuanLy', 'KeToan');

-- 3. TẠO CÁC BẢNG DỮ LIỆU

-- Bảng 1: Chi nhánh Ký túc xá
CREATE TABLE chi_nhanh (
    id UUID PRIMARY KEY,
    ten_chi_nhanh VARCHAR(150) NOT NULL,
    dia_chi VARCHAR(255) NOT NULL,
    so_dien_thoai VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 2: Phòng ở
CREATE TABLE phong (
    id UUID PRIMARY KEY,
    chi_nhanh_id UUID NOT NULL REFERENCES chi_nhanh(id),
    ma_phong VARCHAR(20) UNIQUE NOT NULL,
    loai_phong loai_phong NOT NULL,
    suc_chua_toi_da INT NOT NULL CHECK (suc_chua_toi_da > 0),
    gia_thue_mot_giuong NUMERIC(12,2) NOT NULL,
    gioi_tinh_quy_dinh gioi_tinh,
    khu_vuc VARCHAR(100),
    trang_thai trang_thai_phong NOT NULL DEFAULT 'Trong',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 3: Giường trong phòng
CREATE TABLE giuong (
    id UUID PRIMARY KEY,
    phong_id UUID NOT NULL REFERENCES phong(id) ON DELETE CASCADE,
    ma_giuong VARCHAR(20) NOT NULL,
    trang_thai trang_thai_giuong NOT NULL DEFAULT 'Trong',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 4: Khách hàng (người đăng ký hoặc thành viên thuê)
CREATE TABLE khach_hang (
    id UUID PRIMARY KEY,
    ho_ten VARCHAR(150) NOT NULL,
    so_dien_thoai VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    gioi_tinh gioi_tinh,
    quoc_tich VARCHAR(50),
    so_cmnd_cccd VARCHAR(30),
    la_nguoi_dai_dien_nhom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 5: Người dùng hệ thống (Nhân viên nội bộ)
CREATE TABLE nguoi_dung_he_thong (
    id UUID PRIMARY KEY, -- Liên kết trực tiếp với auth.users của hệ thống xác thực (như Supabase)
    ho_ten VARCHAR(150) NOT NULL,
    vai_tro vai_tro_nguoi_dung NOT NULL,
    chi_nhanh_id UUID REFERENCES chi_nhanh(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 6: Nhu cầu thuê & Lịch xem phòng
CREATE TABLE nhu_cau_thue (
    id UUID PRIMARY KEY,
    khach_hang_id UUID NOT NULL REFERENCES khach_hang(id),
    sale_id UUID NOT NULL REFERENCES nguoi_dung_he_thong(id),
    so_nguoi INT,
    gioi_tinh_yeu_cau gioi_tinh,
    khu_vuc_yeu_cau VARCHAR(100),
    loai_phong_yeu_cau loai_phong,
    muc_gia_toi_da NUMERIC(12,2),
    thoi_gian_vao_o_du_kien DATE,
    thoi_han_thue_du_kien INT, -- số tháng dự kiến thuê
    ghi_chu_yeu_cau TEXT,
    phong_du_kien_id UUID REFERENCES phong(id),
    lich_hen_xem TIMESTAMPTZ,
    phuong_thuc_thong_bao VARCHAR(20),
    trang_thai trang_thai_yeu_cau_thue NOT NULL DEFAULT 'MoiTiepNhan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 7: Phiếu đặt cọc phòng
CREATE TABLE phieu_dat_coc (
    id UUID PRIMARY KEY,
    ma_phieu_coc VARCHAR(30) UNIQUE NOT NULL,
    khach_hang_id UUID NOT NULL REFERENCES khach_hang(id),
    nhu_cau_thue_id UUID REFERENCES nhu_cau_thue(id),
    phong_id UUID NOT NULL REFERENCES phong(id),
    giuong_id UUID REFERENCES giuong(id),
    so_giuong_thue INT NOT NULL CHECK (so_giuong_thue > 0),
    ngay_dat_coc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    han_thanh_toan TIMESTAMPTZ NOT NULL,
    so_tien_coc NUMERIC(12,2) NOT NULL,
    phuong_thuc_thanh_toan phuong_thuc_thanh_toan,
    chung_tu_url VARCHAR(500),
    chi_nhanh_id UUID NOT NULL REFERENCES chi_nhanh(id),
    sale_id UUID NOT NULL REFERENCES nguoi_dung_he_thong(id),
    nguoi_xac_nhan_id UUID REFERENCES nguoi_dung_he_thong(id),
    trang_thai trang_thai_phieu_coc NOT NULL DEFAULT 'ChoThanhToan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 8: Hợp đồng thuê phòng
CREATE TABLE hop_dong (
    id UUID PRIMARY KEY,
    ma_hop_dong VARCHAR(30) UNIQUE NOT NULL,
    phieu_dat_coc_id UUID NOT NULL UNIQUE REFERENCES phieu_dat_coc(id),
    phong_id UUID NOT NULL REFERENCES phong(id),
    ngay_ky TIMESTAMPTZ DEFAULT NOW(),
    ngay_bat_dau DATE NOT NULL,
    ngay_ket_thuc DATE,
    gia_thue_theo_giuong NUMERIC(12,2) NOT NULL,
    ky_thanh_toan VARCHAR(20) DEFAULT 'Thang',
    trang_thai trang_thai_hop_dong NOT NULL DEFAULT 'HieuLuc',
    quan_ly_lap_id UUID NOT NULL REFERENCES nguoi_dung_he_thong(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 9: Thành viên hợp đồng thuê phòng (đối với thuê ghép/nhóm)
CREATE TABLE thanh_vien_hop_dong (
    id UUID PRIMARY KEY,
    hop_dong_id UUID NOT NULL REFERENCES hop_dong(id) ON DELETE CASCADE,
    khach_hang_id UUID NOT NULL REFERENCES khach_hang(id),
    giuong_id UUID NOT NULL REFERENCES giuong(id),
    dat_dieu_kien_cu_tru BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (hop_dong_id, khach_hang_id),
    UNIQUE (hop_dong_id, giuong_id)
);

-- Bảng 10: Hóa đơn thanh toán (kỳ thanh toán hoặc kỳ đầu)
CREATE TABLE hoa_don (
    id UUID PRIMARY KEY,
    ma_hoa_don VARCHAR(30) UNIQUE NOT NULL,
    hop_dong_id UUID NOT NULL REFERENCES hop_dong(id) ON DELETE CASCADE,
    ky_thanh_toan VARCHAR(20) NOT NULL,
    tien_thue NUMERIC(12,2) NOT NULL,
    tien_dien NUMERIC(12,2) NOT NULL DEFAULT 0,
    tien_nuoc NUMERIC(12,2) NOT NULL DEFAULT 0,
    tien_dich_vu_khac NUMERIC(12,2) NOT NULL DEFAULT 0,
    tong_tien NUMERIC(12,2) NOT NULL,
    ngay_thanh_toan TIMESTAMPTZ,
    hinh_thuc_thanh_toan phuong_thuc_thanh_toan,
    trang_thai trang_thai_hoa_don NOT NULL DEFAULT 'ChoThanhToan',
    nguoi_xac_nhan_id UUID REFERENCES nguoi_dung_he_thong(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 11: Danh mục tài sản cố định trong phòng
CREATE TABLE tai_san_phong (
    id UUID PRIMARY KEY,
    phong_id UUID NOT NULL REFERENCES phong(id) ON DELETE CASCADE,
    ten_tai_san VARCHAR(100) NOT NULL,
    so_luong INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 12: Biên bản bàn giao phòng
CREATE TABLE bien_ban_ban_giao (
    id UUID PRIMARY KEY,
    ma_bien_ban VARCHAR(30) UNIQUE NOT NULL,
    hop_dong_id UUID NOT NULL UNIQUE REFERENCES hop_dong(id) ON DELETE CASCADE,
    ngay_ban_giao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tinh_trang_phong VARCHAR(255),
    danh_sach_tai_san JSONB NOT NULL, -- Định dạng: [{"ten": "Giường", "so_luong": 1, "tinh_trang": "Tot", "ghi_chu": ""}]
    anh_bien_ban_url VARCHAR(500),
    quan_ly_xac_nhan_id UUID NOT NULL REFERENCES nguoi_dung_he_thong(id),
    khach_da_ky_xac_nhan BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 13: Biên bản trả phòng & Khấu trừ chi phí
CREATE TABLE bien_ban_tra_phong (
    id UUID PRIMARY KEY,
    ma_bien_ban VARCHAR(30) UNIQUE NOT NULL,
    hop_dong_id UUID NOT NULL UNIQUE REFERENCES hop_dong(id) ON DELETE CASCADE,
    ngay_dang_ky_tra TIMESTAMPTZ NOT NULL,
    ngay_tra_thuc_te TIMESTAMPTZ,
    danh_sach_doi_soat JSONB, -- Định dạng: [{"ten": "Giường", "tinh_trang": "HuHong", "ghi_chu": "...", "chi_phi_boi_thuong": 500000}]
    chi_phi_phat_sinh_tong NUMERIC(12,2) NOT NULL DEFAULT 0,
    ty_le_hoan_coc NUMERIC(5,2),
    so_tien_hoan_khach NUMERIC(12,2),
    so_tien_khach_can_tra_them NUMERIC(12,2) NOT NULL DEFAULT 0,
    khach_xac_nhan_doi_soat BOOLEAN NOT NULL DEFAULT FALSE,
    quan_ly_xac_nhan_id UUID REFERENCES nguoi_dung_he_thong(id),
    ke_toan_xac_nhan_id UUID REFERENCES nguoi_dung_he_thong(id),
    trang_thai trang_thai_bien_ban_tra NOT NULL DEFAULT 'ChoDoiSoat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 14: Lịch sử thay đổi trạng thái phòng/giường (Audit Log)
CREATE TABLE lich_su_trang_thai_phong (
    id UUID PRIMARY KEY,
    phong_id UUID REFERENCES phong(id) ON DELETE SET NULL,
    giuong_id UUID REFERENCES giuong(id) ON DELETE SET NULL,
    trang_thai_truoc VARCHAR(20),
    trang_thai_sau VARCHAR(20) NOT NULL,
    ly_do VARCHAR(255),
    nguoi_thuc_hien_id UUID REFERENCES nguoi_dung_he_thong(id),
    thoi_diem TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_phong_or_giuong CHECK (
        (phong_id IS NOT NULL AND giuong_id IS NULL) OR 
        (phong_id IS NULL AND giuong_id IS NOT NULL)
    )
);

-- 4. TẠO INDEXES PHỤC VỤ TỐI ƯU HÓA TRUY VẤN (PERFORMANCE)
CREATE INDEX idx_phong_chi_nhanh ON phong(chi_nhanh_id);
CREATE INDEX idx_giuong_phong ON giuong(phong_id);
CREATE INDEX idx_nhu_cau_thue_khach ON nhu_cau_thue(khach_hang_id);
CREATE INDEX idx_phieu_dat_coc_khach ON phieu_dat_coc(khach_hang_id);
CREATE INDEX idx_hop_dong_coc ON hop_dong(phieu_dat_coc_id);
CREATE INDEX idx_thanh_vien_hop_dong_hd ON thanh_vien_hop_dong(hop_dong_id);
CREATE INDEX idx_hoa_don_hd ON hoa_don(hop_dong_id);
CREATE INDEX idx_tai_san_phong_phong ON tai_san_phong(phong_id);

-- 5. TẠO TRIGGERS TỰ ĐỘNG CẬP NHẬT COLUMN updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_chi_nhanh_updated_at BEFORE UPDATE ON chi_nhanh FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_phong_updated_at BEFORE UPDATE ON phong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_giuong_updated_at BEFORE UPDATE ON giuong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_khach_hang_updated_at BEFORE UPDATE ON khach_hang FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_nguoi_dung_he_thong_updated_at BEFORE UPDATE ON nguoi_dung_he_thong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_nhu_cau_thue_updated_at BEFORE UPDATE ON nhu_cau_thue FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_phieu_dat_coc_updated_at BEFORE UPDATE ON phieu_dat_coc FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_hop_dong_updated_at BEFORE UPDATE ON hop_dong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_thanh_vien_hop_dong_updated_at BEFORE UPDATE ON thanh_vien_hop_dong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_hoa_don_updated_at BEFORE UPDATE ON hoa_don FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_tai_san_phong_updated_at BEFORE UPDATE ON tai_san_phong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_bien_ban_ban_giao_updated_at BEFORE UPDATE ON bien_ban_ban_giao FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_bien_ban_tra_phong_updated_at BEFORE UPDATE ON bien_ban_tra_phong FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
