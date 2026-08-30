import express from 'express';
import { createPrivateRoom, resolveCode } from '../services/room.service.js';

const router = express.Router();

router.post('/create-chat', async (req, res) => {
  try {
    const createdBy = req.body?.userId || 'anonymous';
    const { roomId, code } = await createPrivateRoom(createdBy);

    const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const inviteLink = `${origin}/join/${code}`;

    console.log(`🔒 New private room created: ${roomId} (code: ${code})`);
    res.json({ roomId, code, inviteLink });
  } catch (err) {
    console.error('❌ Create chat error:', err.message);
    res.status(500).json({ error: 'Failed to create private chat room.' });
  }
});

router.get('/validate-code/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'Invalid invite code format.' });
    }

    const roomId = await resolveCode(code);

    if (!roomId) {
      return res.status(404).json({ error: 'Invalid or expired invite code.' });
    }

    res.json({ roomId, valid: true });
  } catch (err) {
    console.error('❌ Validate code error:', err.message);
    res.status(500).json({ error: 'Code validation failed.' });
  }
});

export default router;
