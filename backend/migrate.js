import sql from './src/db.js'

async function migrate() {
  console.log('--- START MIGRATING COLUMNS FOR bien_ban_tra_phong ---')
  try {
    await sql`
      ALTER TABLE bien_ban_tra_phong 
      ADD COLUMN IF NOT EXISTS tien_thue_con_no NUMERIC(12,2) NOT NULL DEFAULT 0
    `
    console.log('Added column: tien_thue_con_no')

    await sql`
      ALTER TABLE bien_ban_tra_phong 
      ADD COLUMN IF NOT EXISTS tien_dien_nuoc_dich_vu NUMERIC(12,2) NOT NULL DEFAULT 0
    `
    console.log('Added column: tien_dien_nuoc_dich_vu')

    await sql`
      ALTER TABLE bien_ban_tra_phong 
      ADD COLUMN IF NOT EXISTS chi_phi_sua_chua_boi_thuong NUMERIC(12,2) NOT NULL DEFAULT 0
    `
    console.log('Added column: chi_phi_sua_chua_boi_thuong')

    await sql`
      ALTER TABLE bien_ban_tra_phong 
      ADD COLUMN IF NOT EXISTS tien_phat_vi_pham NUMERIC(12,2) NOT NULL DEFAULT 0
    `
    console.log('Added column: tien_phat_vi_pham')

    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    process.exit(0)
  }
}

migrate()
