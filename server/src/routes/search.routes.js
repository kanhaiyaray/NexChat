import express from 'express';
import { resolveCode } from '../services/room.service.js';
import { searchMessages } from '../services/message.service.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const code = String(req.query.code || '');
    const roomId = String(req.query.roomId || '');
    const query = String(req.query.q || '').trim();

    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'A valid room code is required.' });
    }

    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const resolvedRoomId = await resolveCode(code);

    if (!resolvedRoomId) {
      return res.status(404).json({ error: 'Invalid or expired invite code.' });
    }

    if (roomId && roomId !== resolvedRoomId) {
      return res.status(403).json({ error: 'Search is only allowed in the active room.' });
    }

    const results = await searchMessages(resolvedRoomId, query);

    res.json({
      roomId: resolvedRoomId,
      query,
      results,
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed.' });
  }
});

export default router;
