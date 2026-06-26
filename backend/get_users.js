import sql from './src/db.js'

async function main() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('--- TABLES IN DATABASE ---')
    console.log(tables.map(t => t.table_name))
    
    for (const t of tables) {
      const [{ count }] = await sql`SELECT count(*)::int FROM ${sql(t.table_name)}`
      if (count > 0) {
        console.log(`Table ${t.table_name}: ${count} rows`)
      }
    }
  } catch (err) {
    console.error('Error querying database:', err)
  } finally {
    process.exit(0)
  }
}

main()
