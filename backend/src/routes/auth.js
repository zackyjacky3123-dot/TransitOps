import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body || {};

  if (!email) return res.status(400).json({ field: 'email', message: 'Email is required.' });
  if (!isValidEmail(email)) {
    return res.status(400).json({ field: 'email', message: 'Please enter a valid email address.' });
  }
  if (!password) return res.status(400).json({ field: 'password', message: 'Password is required.' });
  if (!role) return res.status(400).json({ field: 'role', message: 'Please select a role to continue.' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    // Always compare against a dummy hash when the user doesn't exist so
    // response timing doesn't reveal account existence.
    const hashToCompare = user?.password_hash || '$2b$10$invalidsaltinvalidsaltinvalidsaltuu';

    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        message: 'Account locked after 5 failed attempts. Try again later or reset your password.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, hashToCompare);
    const roleMatches = user && user.role === role;

    if (!user || !passwordMatches || !roleMatches) {
      if (user) {
        const nextAttempts = user.failed_attempts + 1;
        const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
        await pool.query(
          `UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3`,
          [
            shouldLock ? 0 : nextAttempts,
            shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) : null,
            user.id,
          ]
        );
        if (shouldLock) {
          return res.status(423).json({
            message: 'Account locked after 5 failed attempts. Try again later or reset your password.',
          });
        }
      }
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Successful login — reset lockout counters.
    await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

export default router;
