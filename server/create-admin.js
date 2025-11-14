import { getPool } from './src/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  try {
    const conn = await getPool().getConnection();
    try {
      // Get the first user or any user by email (you can change this)
      const [users] = await conn.query('SELECT id, email FROM users LIMIT 1');
      
      if (users.length === 0) {
        console.log('No users found. Please sign up first through the application.');
        process.exit(1);
      }
      
      const user = users[0];
      
      // Update user role to admin
      await conn.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
      
      console.log(`✅ User ${user.email} (ID: ${user.id}) has been granted admin privileges.`);
      console.log('You can now access the Audit Dashboard.');
      
    } finally {
      conn.release();
    }
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
