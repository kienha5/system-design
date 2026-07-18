import sql from '../src/db.js'

async function main() {
  try {
    const clients = await sql`
      SELECT n.id, n.trang_thai, k.ho_ten, k.so_dien_thoai
      FROM nhu_cau_thue n
      JOIN khach_hang k ON n.khach_hang_id = k.id
      WHERE k.so_dien_thoai = '0966778899'
    `
    console.log('--- CLIENT REQUESTS ---')
    console.log(JSON.stringify(clients, null, 2))
  } catch (err) {
    console.error('Error:', err)
  } finally {
    process.exit(0)
  }
}

main()
