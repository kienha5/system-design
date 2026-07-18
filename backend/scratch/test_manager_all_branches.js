import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import sql from '../src/db.js'

dotenv.config({ path: 'c:/Users/LOQ/Documents/system_design/phong-ktx/backend/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  try {
    console.log('--- UPDATING MANAGER BRANCH TO NULL ---')
    await sql`
      UPDATE nguoi_dung_he_thong
      SET chi_nhanh_id = NULL
      WHERE email = 'quanly@dorm.com'
    `

    console.log('--- LOGGING IN AS MANAGER ---')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'quanly@dorm.com',
      password: 'Demo@1234'
    })

    if (error) {
      throw new Error(`Auth failed: ${error.message}`)
    }

    const token = data.session.access_token

    console.log('--- FETCHING /me ENDPOINT ---')
    const meRes = await fetch('http://localhost:3000/api/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const meData = await meRes.json()
    console.log('Profile Response:', JSON.stringify(meData, null, 2))

    console.log('--- FETCHING /phong (NO BRANCH FILTER) ---')
    // Simulator of TraCuuPhong when chi_nhanh_id is null/undefined
    const roomsRes = await fetch('http://localhost:3000/api/v1/phong', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const roomsData = await roomsRes.json()
    console.log('Rooms Status:', roomsRes.status)
    console.log('Rooms Count:', roomsData.data?.length)
    console.log('First Room Branch:', roomsData.data?.[0]?.chi_nhanh)

  } catch (err) {
    console.error('Error running test:', err)
  } finally {
    // Restore branch association for standard seed tests
    console.log('--- RESTORING MANAGER BRANCH ---')
    await sql`
      UPDATE nguoi_dung_he_thong
      SET chi_nhanh_id = 'c001c001-c001-4001-a001-c001c001c001'
      WHERE email = 'quanly@dorm.com'
    `
    process.exit(0)
  }
}

run()
