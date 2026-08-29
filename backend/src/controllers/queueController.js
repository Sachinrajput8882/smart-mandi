const { db } = require('../config/db');

// Connected SSE clients for instant real-time queue synchronization
let sseClients = [];

function broadcastQueueUpdate(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

// Helper to compute queue positions and estimated wait times
function enrichQueueWithPositions(slots) {
  let waitingCounter = 0;

  return slots.map(slot => {
    let position = null;
    let estimatedWaitMinutes = 0;

    if (slot.status === 'waiting') {
      waitingCounter++;
      position = waitingCounter;
      estimatedWaitMinutes = position * 10;
    } else if (slot.status === 'called') {
      position = 0;
      estimatedWaitMinutes = 0; // Immediate entry
    } else if (slot.status === 'processing') {
      position = 0;
      estimatedWaitMinutes = 5; // In-progress weighment
    } else if (slot.status === 'payment_processing') {
      position = 0;
      estimatedWaitMinutes = 0; // Weighing complete, in PFMS DBT pipeline
    } else {
      position = null;
      estimatedWaitMinutes = 0;
    }

    return {
      ...slot,
      position,
      estimated_wait_minutes: estimatedWaitMinutes
    };
  });
}

function computeSummary(enriched) {
  return {
    total: enriched.length,
    waiting: enriched.filter(s => s.status === 'waiting').length,
    called: enriched.filter(s => s.status === 'called').length,
    processing: enriched.filter(s => s.status === 'processing').length,
    payment_processing: enriched.filter(s => s.status === 'payment_processing').length,
    done: enriched.filter(s => s.status === 'done').length,
    shift_1_day: enriched.filter(s => (s.shift || 'shift_1_day') === 'shift_1_day').length,
    shift_2_night: enriched.filter(s => s.shift === 'shift_2_night').length
  };
}

// Real-time SSE Stream Endpoint
exports.streamQueue = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.write('\n');

  sseClients.push(res);

  // Send current queue state immediately
  try {
    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    res.write(`event: init\ndata: ${JSON.stringify({ queue: enriched, summary })}\n\n`);
  } catch (err) {
    console.error('Error sending initial SSE:', err);
  }

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
};

// 1. POST /book - Create a new farmer slot booking
exports.bookSlot = async (req, res) => {
  try {
    const { name, farmer_name, crop_type, quantity, preferred_date, phone, gate_assigned, vehicle_no, shift } = req.body;
    const farmerName = name || farmer_name;

    if (!farmerName || !farmerName.trim()) {
      return res.status(400).json({ success: false, message: 'Farmer name is required' });
    }
    if (!crop_type || !crop_type.trim()) {
      return res.status(400).json({ success: false, message: 'Crop type is required' });
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number in quintals' });
    }
    if (!preferred_date) {
      return res.status(400).json({ success: false, message: 'Preferred date is required' });
    }

    const newBooking = await db.createBooking({
      farmerName: farmerName.trim(),
      phone: phone ? phone.trim() : '',
      cropType: crop_type.trim(),
      quantity: Number(quantity),
      preferredDate: preferred_date,
      gateAssigned: gate_assigned || 'Gate 1',
      vehicleNo: vehicle_no ? vehicle_no.trim().toUpperCase() : '',
      shift: shift || 'shift_1_day'
    });

    // Calculate position for the new booking
    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    const enrichedCurrent = enriched.find(s => s.token_id === newBooking.token_id) || newBooking;

    // Broadcast instant update
    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.status(201).json({
      success: true,
      message: 'Farmer slot booked successfully',
      data: enrichedCurrent
    });
  } catch (err) {
    console.error('Error booking slot:', err);
    return res.status(500).json({ success: false, message: 'Failed to book slot', error: err.message });
  }
};

// 2. GET /queue - Get all slots with computed queue position & wait time
exports.getQueue = async (req, res) => {
  try {
    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);

    return res.json({
      success: true,
      summary,
      queue: enriched
    });
  } catch (err) {
    console.error('Error fetching queue:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch queue', error: err.message });
  }
};

// 3. PUT /next - Call next farmer in queue
exports.callNext = async (req, res) => {
  try {
    const nextSlot = await db.callNextWaiting();
    if (!nextSlot) {
      return res.status(404).json({
        success: false,
        message: 'No farmers currently in waiting queue'
      });
    }

    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    const updatedEnriched = enriched.find(s => s.token_id === nextSlot.token_id) || nextSlot;

    // Broadcast instant update
    broadcastQueueUpdate('queue_update', { queue: enriched, summary, calledSlot: updatedEnriched });

    return res.json({
      success: true,
      message: `Token ${nextSlot.token_id} called successfully`,
      data: updatedEnriched
    });
  } catch (err) {
    console.error('Error calling next farmer:', err);
    return res.status(500).json({ success: false, message: 'Failed to call next farmer', error: err.message });
  }
};

// 4. PUT /update-status - Update status of a specific token
exports.updateStatus = async (req, res) => {
  try {
    const { token_id, tokenId, status } = req.body;
    const targetToken = token_id || tokenId || req.query.token_id || req.params.tokenId;

    if (!targetToken) {
      return res.status(400).json({ success: false, message: 'Token ID is required' });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updated = await db.updateStatus(targetToken, status.toLowerCase());
    if (!updated) {
      return res.status(404).json({ success: false, message: `Token ${targetToken} not found` });
    }

    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    const updatedEnriched = enriched.find(s => s.token_id === updated.token_id) || updated;

    // Broadcast instant update
    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.json({
      success: true,
      message: `Token ${targetToken} status updated to ${status}`,
      data: updatedEnriched
    });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update status', error: err.message });
  }
};

// 5. GET /queue/:tokenId - Get details for a specific token
exports.getByToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);

    const match = enriched.find(s => s.token_id.toUpperCase() === tokenId.toUpperCase());
    if (!match) {
      return res.status(404).json({ success: false, message: `Token ${tokenId} not found` });
    }

    return res.json({
      success: true,
      data: match
    });
  } catch (err) {
    console.error('Error fetching token:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch token', error: err.message });
  }
};

// 6. GET /analytics - Simple Mandi procurement analytics
exports.getAnalytics = async (req, res) => {
  try {
    const allSlots = await db.getAll();
    const today = new Date().toISOString().split('T')[0];
    const todaySlots = allSlots.filter(s => s.preferred_date === today || s.created_at.startsWith(today));

    const totalQuintals = allSlots.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const procuredQuintals = allSlots
      .filter(s => s.status === 'done')
      .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

    // Crop breakdown
    const cropBreakdown = {};
    allSlots.forEach(s => {
      const crop = s.crop_type || 'Other';
      cropBreakdown[crop] = (cropBreakdown[crop] || 0) + (Number(s.quantity) || 0);
    });

    return res.json({
      success: true,
      data: {
        totalFarmers: allSlots.length,
        farmersToday: todaySlots.length,
        totalQuintalsRegistered: totalQuintals,
        totalQuintalsProcured: procuredQuintals,
        waitingCount: allSlots.filter(s => s.status === 'waiting').length,
        calledCount: allSlots.filter(s => s.status === 'called').length,
        processingCount: allSlots.filter(s => s.status === 'processing').length,
        doneCount: allSlots.filter(s => s.status === 'done').length,
        cropBreakdown
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: err.message });
  }
};

// 7. POST /reset-seed - Reset demo seed data
exports.resetSeed = async (req, res) => {
  try {
    const seed = await db.resetSeed();
    const enriched = enrichQueueWithPositions(seed);
    const summary = computeSummary(enriched);

    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.json({
      success: true,
      message: 'Queue reset to sample seed data successfully',
      queue: enriched
    });
  } catch (err) {
    console.error('Error resetting seed:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset queue', error: err.message });
  }
};

// 8. DELETE /queue/:tokenId - Delete slot from queue
exports.deleteSlot = async (req, res) => {
  try {
    const { tokenId } = req.params;
    await db.deleteSlot(tokenId);

    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);

    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.json({
      success: true,
      message: `Token ${tokenId} deleted successfully`,
      queue: enriched
    });
  } catch (err) {
    console.error('Error deleting slot:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete slot', error: err.message });
  }
};
