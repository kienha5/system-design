import { createClient } from '@supabase/supabase-js';
import sql from '../src/db.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000/api/v1';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Lỗi: SUPABASE_URL hoặc SUPABASE_ANON_KEY chưa được định nghĩa trong file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  console.log('=== STARTING BACKEND VALIDATION ERRORS TEST ===\n');

  try {
    // 1. Login as QuanLy to get auth token
    console.log('Logging in as Quản lý...');
    const { data: qlData, error: qlErr } = await supabase.auth.signInWithPassword({
      email: 'quanly@dorm.com',
      password: 'Demo@1234'
    });
    if (qlErr) throw qlErr;
    const token = qlData.session.access_token;
    console.log('Login successful! JWT Token acquired.\n');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 2. Query seed data to get test IDs directly from DB
    console.log('Retrieving test IDs from DB...');
    const [an] = await sql`SELECT id FROM khach_hang WHERE ho_ten = 'Nguyễn Văn An'`;
    const [p101] = await sql`SELECT id FROM phong WHERE ma_phong = 'P101'`;
    const [g101A] = await sql`SELECT id FROM giuong WHERE phong_id = ${p101.id} LIMIT 1`;
    const [nctAn] = await sql`SELECT id FROM nhu_cau_thue WHERE khach_hang_id = ${an.id} LIMIT 1`;

    const branchId = 'c001c001-c001-4001-a001-c001c001c001';

    // Check if we already have a contract for PDC000001
    const [existingContract] = await sql`
      SELECT id FROM hop_dong WHERE phieu_dat_coc_id IN (
        SELECT id FROM phieu_dat_coc WHERE ma_phieu_coc = 'PDC000001'
      )
    `;
    if (existingContract) {
      console.log('Contract for PDC000001 already exists, cleaning up to run tests cleanly...');
      await sql`DELETE FROM bien_ban_ban_giao WHERE hop_dong_id = ${existingContract.id}`;
      await sql`DELETE FROM hoa_don WHERE hop_dong_id = ${existingContract.id}`;
      await sql`DELETE FROM thanh_vien_hop_dong WHERE hop_dong_id = ${existingContract.id}`;
      await sql`DELETE FROM hop_dong WHERE id = ${existingContract.id}`;
    }

    const [pdcAn] = await sql`SELECT id, trang_thai FROM phieu_dat_coc WHERE ma_phieu_coc = 'PDC000001'`;
    const slipId = pdcAn.id;

    // Create an unpaid deposit slip temporarily in the DB to test PHIEU_COC_CHUA_XAC_NHAN
    console.log('Creating a temporary unpaid deposit slip...');
    const [tempSlip] = await sql`
      INSERT INTO phieu_dat_coc (id, ma_phieu_coc, khach_hang_id, nhu_cau_thue_id, phong_id, giuong_id, so_giuong_thue, han_thanh_toan, so_tien_coc, chi_nhanh_id, sale_id, trang_thai)
      VALUES (
        gen_random_uuid(), 'PDC_TEMP_TEST', ${an.id}, ${nctAn.id}, ${p101.id}, ${g101A.id}, 1, 
        NOW() + INTERVAL '24 hours', 4000000.00, ${branchId}, ${qlData.user.id}, 'ChoThanhToan'
      )
      RETURNING id
    `;
    const unpaidSlipId = tempSlip.id;
    console.log(`Temporary unpaid deposit slip created: ID = ${unpaidSlipId}\n`);

    // --- TEST CASE 1: Create contract with unpaid deposit slip ---
    console.log('--- TEST CASE 1: Lập hợp đồng với phiếu cọc chưa thanh toán ---');
    const res1 = await fetch(`${BASE_URL}/hop-dong`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phieu_dat_coc_id: unpaidSlipId,
        ngay_bat_dau: '2026-07-17',
        ngay_ket_thuc: null,
        ky_thanh_toan: 'Thang',
        thanh_vien: [
          {
            khach_hang_id: an.id,
            giuong_id: g101A.id
          }
        ]
      })
    });
    const data1 = await res1.json();
    if (res1.ok) {
      console.log('FAIL: Created contract with unpaid slip successfully (Should have failed!).');
    } else {
      console.log(`PASS: Received expected error!`);
      console.log(`Status code: ${res1.status}`);
      console.log(`Error Code: ${data1.error?.code}`);
      console.log(`Message: ${data1.error?.message}\n`);
    }

    // Clean up temporary unpaid slip
    await sql`DELETE FROM phieu_dat_coc WHERE id = ${unpaidSlipId}`;

    // --- TEST CASE 2: Create contract twice with the same deposit slip ---
    console.log('--- TEST CASE 2: Lập hợp đồng lần 2 với cùng một phiếu cọc ---');
    const payload = {
      phieu_dat_coc_id: slipId,
      ngay_bat_dau: '2026-07-17',
      ngay_ket_thuc: null,
      ky_thanh_toan: 'Thang',
      thanh_vien: [
        {
          khach_hang_id: an.id,
          giuong_id: g101A.id
        }
      ]
    };

    console.log('First contract creation...');
    const firstContractRes = await fetch(`${BASE_URL}/hop-dong`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const firstContractData = await firstContractRes.json();
    const contractId = firstContractData.data.id;
    console.log(`First contract created successfully: ID = ${contractId}`);

    console.log('Second contract creation with same slip...');
    const secondContractRes = await fetch(`${BASE_URL}/hop-dong`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const secondContractData = await secondContractRes.json();
    if (secondContractRes.ok) {
      console.log('FAIL: Created second contract successfully (Should have failed!).');
    } else {
      console.log(`PASS: Received expected error!`);
      console.log(`Status code: ${secondContractRes.status}`);
      console.log(`Error Code: ${secondContractData.error?.code}`);
      console.log(`Message: ${secondContractData.error?.message}\n`);
    }

    // --- TEST CASE 3: Create handover (UC11 Step 1) when invoice is unpaid ---
    console.log('--- TEST CASE 3: Bàn giao phòng khi hóa đơn kỳ đầu chưa thanh toán ---');
    console.log('Attempting to create handover report (Step 1)...');
    const bbgRes = await fetch(`${BASE_URL}/bien-ban-ban-giao`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        hop_dong_id: contractId,
        tinh_trang_phong: 'Tốt',
        danh_sach_tai_san: [
          { ten: 'Giường đơn', so_luong: 1, tinh_trang: 'Tot' }
        ]
      })
    });
    const bbgData = await bbgRes.json();
    if (bbgRes.ok) {
      console.log('FAIL: Created handover report with unpaid invoice successfully (Should have failed!).');
    } else {
      console.log(`PASS: Received expected error!`);
      console.log(`Status code: ${bbgRes.status}`);
      console.log(`Error Code: ${bbgData.error?.code}`);
      console.log(`Message: ${bbgData.error?.message}\n`);
    }

    // Let's keep the DB clean by deleting the created contract
    console.log('Cleaning up test contract...');
    await sql`DELETE FROM thanh_vien_hop_dong WHERE hop_dong_id = ${contractId}`;
    await sql`DELETE FROM hop_dong WHERE id = ${contractId}`;
    console.log('Cleanup completed.\n');

    console.log('=== BACKEND VALIDATION ERRORS TEST COMPLETED ===');
  } catch (err) {
    console.error('Unexpected test failure:', err.stack || err.message);
  } finally {
    process.exit(0);
  }
}

test();
