import sql from './src/db.js'

async function check() {
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bien_ban_tra_phong';
    `
    console.log('Columns in bien_ban_tra_phong:', cols)
  } catch (err) {
    console.error(err)
  } finally {
    process.exit(0)
  }
}

check()
