import { logDebug } from '../src/utils/logger.js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/Users/LOQ/Documents/system_design/phong-ktx/backend/.env' })

// Ensure DEBUG_TRACE is true for this process
process.env.DEBUG_TRACE = 'true'

async function run() {
  console.log('--- CALLING logDebug WITH Date OBJECT ---')
  
  const testObject = {
    ma_phieu: 'PC9999',
    han_thanh_toan: new Date('2026-07-20T10:00:00.000Z'),
    complex: {
      dateField: new Date('2026-07-25T15:30:00.000Z'),
      numberField: 4500000
    }
  }

  logDebug('Test Log 1', testObject)
  logDebug('Test Log 2', { status: 'Success' })

  console.log('Check the console output above. Date fields must NOT be {} and sequence must increment.')
  process.exit(0)
}

run()
