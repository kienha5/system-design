import sql from '../src/db.js'

async function main() {
  try {
    const users = await sql`
      SELECT id, ho_ten, vai_tro, chi_nhanh_id, email
      FROM nguoi_dung_he_thong
    `
    console.log('--- ALL USERS ---')
    console.log(JSON.stringify(users, null, 2))
  } catch (err) {
    console.error('Error:', err)
  } finally {
    process.exit(0)
  }
}

main()
