import { checkIsAdmin } from '../services/profile.service.js';

export const isAdmin = async (req, res, next) => {
  const clerkId = req.headers['x-clerk-id'] || req.query.clerkId;

  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized – no clerkId' });
  }

  const isAdminUser = await checkIsAdmin(clerkId);

  if (!isAdminUser) {
    return res.status(403).json({ error: 'Forbidden – admin access required' });
  }

  req.admin = { clerkId };
  next();
};

export const checkAdminRole = async (req, res) => {
  const email = req.query.email || req.headers['x-user-email'];
  const clerkId = req.query.clerkId || req.headers['x-clerk-id'];

  if (!email && !clerkId) {
    return res.status(401).json({ error: 'Missing email or clerkId' });
  }

  try {
    const isAdminUser = await checkIsAdmin({ email, clerkId });
    res.json({ isAdmin: isAdminUser });
  } catch (err) {
    console.error('Admin check error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export default { isAdmin, checkAdminRole };
