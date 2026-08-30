const { db } = require('../config/db');

// Connected SSE clients for instant real-time queue synchronization
let sseClients = [];

function broadcastQueueUpdate(event, data) {
  sseClients.forEach(client => {
    try {
      let payloadData = data;
      if (data.queue && client.role !== 'admin') {
        payloadData = {
          ...data,
          queue: data.queue.filter(s => s.status !== 'cancelled')
        };
      }
      const payload = `event: ${event}\ndata: ${JSON.stringify(payloadData)}\n\n`;
      client.res.write(payload);
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

const DAILY_CAPACITY_QUINTALS = 3000;
const ALL_GATES = ['Gate 1', 'Gate 2', 'Gate 3'];

function computeDateWiseBreakdown(enriched) {
  const breakdown = [];
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const activeForDate = enriched.filter(
      s => s.status !== 'cancelled' &&
      (s.preferred_date === dateStr || (i === 0 && s.created_at && s.created_at.startsWith(dateStr)))
    );

    const bookedQtl = activeForDate.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const remainingQtl = Math.max(0, DAILY_CAPACITY_QUINTALS - bookedQtl);
    const percent = Math.min(100, Math.round((bookedQtl / DAILY_CAPACITY_QUINTALS) * 100));
    const vehicles = activeForDate.filter(s => s.vehicle_no && s.vehicle_no.trim().length > 0).length;

    let status = 'available'; // 'available' | 'fast_filling' | 'full'
    if (remainingQtl === 0) status = 'full';
    else if (percent >= 70) status = 'fast_filling';

    breakdown.push({
      date: dateStr,
      is_today: i === 0,
      is_tomorrow: i === 1,
      booked_quintals: bookedQtl,
      remaining_quintals: remainingQtl,
      capacity_percentage: percent,
      vehicles_count: vehicles,
      farmers_count: activeForDate.length,
      status
    });
  }
  return breakdown;
}

// 3 Farmers Waiting per Gate Rule: Automatic Dynamic Load Balancing
function determineBalancedGate(slots, requestedGate = 'Gate 1') {
  const cleanRequested = ALL_GATES.includes(requestedGate) ? requestedGate : 'Gate 1';

  // Count active waiting farmers at each gate
  const waitingSlots = slots.filter(s => s.status === 'waiting');

  const gateCounts = {
    'Gate 1': waitingSlots.filter(s => (s.gate_assigned || 'Gate 1') === 'Gate 1').length,
    'Gate 2': waitingSlots.filter(s => s.gate_assigned === 'Gate 2').length,
    'Gate 3': waitingSlots.filter(s => s.gate_assigned === 'Gate 3').length,
  };

  // If requested gate has less than 3 waiting farmers, assign requested gate directly
  if (gateCounts[cleanRequested] < 3) {
    return {
      assignedGate: cleanRequested,
      wasRebalanced: false,
      originalGate: cleanRequested,
      gateCounts
    };
  }

  // If requested gate already has 3 or more waiting farmers, find an alternate gate with < 3 waiting
  const eligibleGates = ALL_GATES.filter(g => gateCounts[g] < 3).sort((a, b) => gateCounts[a] - gateCounts[b]);

  if (eligibleGates.length > 0) {
    const chosenGate = eligibleGates[0];
    return {
      assignedGate: chosenGate,
      wasRebalanced: true,
      originalGate: cleanRequested,
      reason: `${cleanRequested} पर 3 किसान पहले से प्रतीक्षारत हैं। भार संतुलन के लिए ${chosenGate} स्वतः आवंटित किया गया। (${cleanRequested} has 3 waiting farmers; auto-routed to ${chosenGate})`,
      gateCounts
    };
  }

  // If ALL gates have >= 3 waiting farmers, assign gate with lowest queue
  const leastLoadedGate = [...ALL_GATES].sort((a, b) => gateCounts[a] - gateCounts[b])[0];
  return {
    assignedGate: leastLoadedGate,
    wasRebalanced: leastLoadedGate !== cleanRequested,
    originalGate: cleanRequested,
    reason: `सभी गेटों पर प्रतीक्षा अधिक है। न्यूनतम कतार वाला ${leastLoadedGate} आवंटित किया गया।`,
    gateCounts
  };
}

function computeSummary(enriched) {
  const today = new Date().toISOString().split('T')[0];
  const activeToday = enriched.filter(s => s.status !== 'cancelled' && (s.preferred_date === today || (s.created_at && s.created_at.startsWith(today))));
  const totalQuintalsToday = activeToday.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const totalVehiclesCount = activeToday.filter(s => s.vehicle_no && s.vehicle_no.trim()).length;

  const waitingSlots = enriched.filter(s => s.status === 'waiting');
  const gateWaitingCounts = {
    'Gate 1': waitingSlots.filter(s => (s.gate_assigned || 'Gate 1') === 'Gate 1').length,
    'Gate 2': waitingSlots.filter(s => s.gate_assigned === 'Gate 2').length,
    'Gate 3': waitingSlots.filter(s => s.gate_assigned === 'Gate 3').length,
  };

  return {
    total: enriched.length,
    waiting: waitingSlots.length,
    called: enriched.filter(s => s.status === 'called').length,
    processing: enriched.filter(s => s.status === 'processing').length,
    payment_processing: enriched.filter(s => s.status === 'payment_processing').length,
    done: enriched.filter(s => s.status === 'done').length,
    cancelled: enriched.filter(s => s.status === 'cancelled').length,
    shift_1_day: enriched.filter(s => (s.shift || 'shift_1_day') === 'shift_1_day').length,
    shift_2_night: enriched.filter(s => s.shift === 'shift_2_night').length,
    // Daily Mandi 3000 Quintal Quota & Vehicle Statistics
    daily_capacity_limit: DAILY_CAPACITY_QUINTALS,
    quintals_booked_today: totalQuintalsToday,
    quintals_remaining_today: Math.max(0, DAILY_CAPACITY_QUINTALS - totalQuintalsToday),
    capacity_percentage: Math.min(100, Math.round((totalQuintalsToday / DAILY_CAPACITY_QUINTALS) * 100)),
    vehicles_arrived_today: totalVehiclesCount,
    // Gate Waiting Distribution (for 3-Farmer Limit Detection)
    gate_waiting_counts: gateWaitingCounts,
    has_gate_overload: Object.values(gateWaitingCounts).some(c => c >= 3),
    // 7-Day Date-wise Mandi Intake Status
    date_wise_breakdown: computeDateWiseBreakdown(enriched)
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

  const clientObj = { res, role: req.query.role };
  sseClients.push(clientObj);

  // Send current queue state immediately
  try {
    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    const queueToReturn = clientObj.role === 'admin'
      ? enriched
      : enriched.filter(s => s.status !== 'cancelled');
    res.write(`event: init\ndata: ${JSON.stringify({ queue: queueToReturn, summary })}\n\n`);
  } catch (err) {
    console.error('Error sending initial SSE:', err);
  }

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== clientObj);
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

    // STRICT 3000 QUINTALS PER DAY MANDI CAPACITY VALIDATION
    const allExistingSlots = await db.getAll();
    const existingBookedForDate = allExistingSlots
      .filter(s => s.status !== 'cancelled' && s.preferred_date === preferred_date)
      .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

    const requestedQty = Number(quantity);
    if (existingBookedForDate + requestedQty > DAILY_CAPACITY_QUINTALS) {
      const remainingQuota = Math.max(0, DAILY_CAPACITY_QUINTALS - existingBookedForDate);
      return res.status(400).json({
        success: false,
        message: `मंडी की दैनिक क्षमता (3000 क्विंटल) पूरी होने वाली है! ${preferred_date} के लिए केवल ${remainingQuota} क्विंटल स्थान शेष है। (Daily Mandi quota of 3000 quintals exceeded. Only ${remainingQuota} quintals available for ${preferred_date}.)`,
        daily_capacity_limit: DAILY_CAPACITY_QUINTALS,
        already_booked: existingBookedForDate,
        remaining_quota: remainingQuota
      });
    }

    // Dynamic 3-Farmer Gate Balancing
    const gateResolution = determineBalancedGate(allExistingSlots, gate_assigned || 'Gate 1');
    const finalGate = gateResolution.assignedGate;

    const newBooking = await db.createBooking({
      farmerName: farmerName.trim(),
      phone: phone ? phone.trim() : '',
      cropType: crop_type.trim(),
      quantity: Number(quantity),
      preferredDate: preferred_date,
      gateAssigned: finalGate,
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
      message: gateResolution.wasRebalanced
        ? `किसान स्लॉट सफलतापूर्वक बुक हुआ: ${gateResolution.reason}`
        : 'Farmer slot booked successfully',
      was_gate_rebalanced: gateResolution.wasRebalanced,
      gate_reason: gateResolution.reason || '',
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

    const isAdmin = req.query.role === 'admin';
    // Privacy Rule: Public view hides cancelled tokens; Admin view sees all
    const queueToReturn = isAdmin
      ? enriched
      : enriched.filter(s => s.status !== 'cancelled');

    return res.json({
      success: true,
      summary,
      queue: queueToReturn
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
    const { token_id, tokenId, status, reason, cancellation_reason } = req.body;
    const targetToken = token_id || tokenId || req.query.token_id || req.params.tokenId;

    if (!targetToken) {
      return res.status(400).json({ success: false, message: 'Token ID is required' });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const cancelReason = cancellation_reason || reason || '';
    const updated = await db.updateStatus(targetToken, status.toLowerCase(), cancelReason);
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

// 9. PUT /change-gate - Admin manually reassigns farmer's gate
exports.changeGate = async (req, res) => {
  try {
    const { token_id, tokenId, gate_assigned, gate } = req.body;
    const targetToken = token_id || tokenId || req.query.token_id;
    const newGate = gate_assigned || gate;

    if (!targetToken) {
      return res.status(400).json({ success: false, message: 'Token ID is required' });
    }
    if (!newGate || !ALL_GATES.includes(newGate)) {
      return res.status(400).json({ success: false, message: 'Valid Gate (Gate 1, Gate 2, Gate 3) is required' });
    }

    const updated = await db.updateGate(targetToken, newGate);
    if (!updated) {
      return res.status(404).json({ success: false, message: `Token ${targetToken} not found` });
    }

    const allSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(allSlots);
    const summary = computeSummary(enriched);
    const updatedEnriched = enriched.find(s => s.token_id === updated.token_id) || updated;

    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.json({
      success: true,
      message: `Token ${targetToken} gate changed to ${newGate}`,
      data: updatedEnriched
    });
  } catch (err) {
    console.error('Error changing gate:', err);
    return res.status(500).json({ success: false, message: 'Failed to change gate', error: err.message });
  }
};

// 10. POST /rebalance-gates - Dynamically balance gates if any gate has > 3 waiting farmers
exports.rebalanceGates = async (req, res) => {
  try {
    const allSlots = await db.getAll();
    const waitingSlots = allSlots.filter(s => s.status === 'waiting');

    const rebalancedTokens = [];
    const gateQueues = {
      'Gate 1': waitingSlots.filter(s => (s.gate_assigned || 'Gate 1') === 'Gate 1'),
      'Gate 2': waitingSlots.filter(s => s.gate_assigned === 'Gate 2'),
      'Gate 3': waitingSlots.filter(s => s.gate_assigned === 'Gate 3')
    };

    // Redistribute excess waiting farmers (> 3) to available gates (< 3)
    for (const overloadedGate of ALL_GATES) {
      while (gateQueues[overloadedGate].length > 3) {
        const availableGate = ALL_GATES.find(g => gateQueues[g].length < 3);
        if (!availableGate) break; // All gates full

        const farmerToMove = gateQueues[overloadedGate].pop();
        gateQueues[availableGate].push(farmerToMove);

        await db.updateGate(farmerToMove.token_id, availableGate);
        rebalancedTokens.push({
          token_id: farmerToMove.token_id,
          farmer_name: farmerToMove.farmer_name,
          from: overloadedGate,
          to: availableGate
        });
      }
    }

    const refreshedSlots = await db.getAll();
    const enriched = enrichQueueWithPositions(refreshedSlots);
    const summary = computeSummary(enriched);

    broadcastQueueUpdate('queue_update', { queue: enriched, summary });

    return res.json({
      success: true,
      rebalanced_count: rebalancedTokens.length,
      rebalanced_tokens: rebalancedTokens,
      message: rebalancedTokens.length > 0
        ? `${rebalancedTokens.length} किसानों के गेट संतुलित किए गए। (Rebalanced ${rebalancedTokens.length} waiting farmers)`
        : 'सभी गेट पहले से संतुलित हैं। (All gates are already balanced with <= 3 waiting)'
    });
  } catch (err) {
    console.error('Error rebalancing gates:', err);
    return res.status(500).json({ success: false, message: 'Failed to rebalance gates', error: err.message });
  }
};

exports.determineBalancedGate = determineBalancedGate;
exports.computeDateWiseBreakdown = computeDateWiseBreakdown;

