import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/LOQ/Documents/system_design/phong-ktx/backend/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'sale@dorm.com',
    password: 'Demo@1234'
  })

  if (error) {
    console.error('Auth failure:', error.message)
    process.exit(1)
  }

  const token = data.session.access_token

  // Try querying with the specific branch UUID
  const url = `http://localhost:3000/api/v1/phong?chi_nhanh_id=c001c001-c001-4001-a001-c001c001c001`
  console.log('Fetching:', url)
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const resData = await res.json()
  console.log('Status code:', res.status)
  console.log('Response data:', JSON.stringify(resData, null, 2))
}

run()
