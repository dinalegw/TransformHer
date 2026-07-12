import Database from 'better-sqlite3';
import { pbkdf2Sync, randomBytes } from 'crypto';

const db = new Database('data/transformher.db');

// Check admin user
const user = db.prepare('SELECT * FROM user WHERE email = ?').get('admin@transformher.com');
console.log('Admin user:', user ? { id: user.id, name: user.name, email: user.email, role: user.role, is_admin: user.is_admin } : 'NOT FOUND');

// Verify password
if (user) {
  const [saltHex, keyHex] = user.password_hash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const key = pbkdf2Sync('Admin@123', salt, 100000, 32, 'sha256');
  const match = key.toString('hex') === keyHex;
  console.log('Password match:', match);
}

// Check books
const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get();
console.log('Total books:', count.cnt);
const allBooks = db.prepare('SELECT id, slug, title, price, currency, source FROM books ORDER BY id').all();
console.log('All books:', JSON.stringify(allBooks, null, 2));

// Check pending_changes
const pcCount = db.prepare('SELECT COUNT(*) as cnt FROM pending_changes').get();
console.log('Pending changes:', pcCount.cnt);

// Check DB schema file is correct (local vs pg schema)
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='books'").get();
console.log('Books table SQL:', schema ? schema.sql.substring(0, 200) : 'NOT FOUND');

db.close();
