import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create database connection
const db = new Database(join(__dirname, 'pedi-psych-kb.db'))

// Enable foreign key constraints
db.pragma('foreign_keys = ON')

// Read and execute schema
try {
  console.log('Creating database schema...')
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  db.exec(schema)
  console.log('✅ Schema created successfully')
} catch (error) {
  console.error('❌ Error creating schema:', error)
  process.exit(1)
}

// Read and execute seed data
try {
  console.log('Seeding database...')
  const seedData = readFileSync(join(__dirname, 'seed.sql'), 'utf-8')
  db.exec(seedData)
  console.log('✅ Database seeded successfully')
} catch (error) {
  console.error('❌ Error seeding database:', error)
  process.exit(1)
}

// Verify data insertion
try {
  console.log('\n📊 Database statistics:')
  
  const tenants = db.prepare('SELECT COUNT(*) as count FROM tenants').get()
  console.log(`Tenants: ${tenants.count}`)
  
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get()
  console.log(`Users: ${users.count}`)
  
  const cards = db.prepare('SELECT COUNT(*) as count FROM cards').get()
  console.log(`Cards: ${cards.count}`)
  
  const policies = db.prepare('SELECT COUNT(*) as count FROM policies').get()
  console.log(`Policies: ${policies.count}`)
  
  // Show sample data
  console.log('\n👥 Sample users:')
  const sampleUsers = db.prepare('SELECT email, name, role FROM users LIMIT 3').all()
  sampleUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role}`)
  })
  
  console.log('\n📚 Sample cards:')
  const sampleCards = db.prepare('SELECT title_en, category FROM cards LIMIT 3').all()
  sampleCards.forEach(card => {
    console.log(`  - ${card.title_en} (${card.category})`)
  })
  
} catch (error) {
  console.error('❌ Error verifying data:', error)
}

console.log('\n🎉 Database setup completed successfully!')
console.log('💡 Default passwords for all users: password123')

db.close()