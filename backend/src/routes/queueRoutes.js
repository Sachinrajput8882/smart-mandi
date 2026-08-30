const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

// Real-Time Server-Sent Events (SSE) Stream
router.get('/queue/stream', queueController.streamQueue);

// Required Endpoints as per specification:
// POST /book -> create booking
router.post('/book', queueController.bookSlot);

// GET /queue -> get all slots
router.get('/queue', queueController.getQueue);

// PUT /next -> call next farmer
router.put('/next', queueController.callNext);

// PUT /update-status -> update status
router.put('/update-status', queueController.updateStatus);

// PUT /change-gate -> update gate
router.put('/change-gate', queueController.changeGate);

// POST /rebalance-gates -> rebalance waiting queues
router.post('/rebalance-gates', queueController.rebalanceGates);

// Additional helpful endpoints:
router.get('/queue/:tokenId', queueController.getByToken);
router.delete('/queue/:tokenId', queueController.deleteSlot);
router.get('/analytics', queueController.getAnalytics);
router.post('/reset-seed', queueController.resetSeed);

module.exports = router;
