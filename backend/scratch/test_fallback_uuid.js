import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/LOQ/Documents/system_design/phong-ktx/backend/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  try {
    console.log('--- LOGGING IN AS SALE ---')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'sale@dorm.com',
      password: 'Demo@1234'
    })

    if (error) {
      throw new Error(`Auth failed: ${error.message}`)
    }

    const token = data.session.access_token

    console.log('--- FETCHING /me WITHOUT X-Request-ID HEADER ---')
    const res = await fetch('http://localhost:3000/api/v1/me', {
      headers: { 
        'Authorization': `Bearer ${token}`
        // Notice X-Request-ID is completely omitted here
      }
    })

    const returnedRequestId = res.headers.get('x-request-id')
    console.log('Returned x-request-id header:', returnedRequestId)

    // Regex check for UUID format: 8-4-4-4-12 hex chars
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnedRequestId)
    console.log('Is valid UUID format?', isUuid ? 'YES' : 'NO')

  } catch (err) {
    console.error('Error running test:', err)
  } finally {
    process.exit(0)
  }
}

run()
