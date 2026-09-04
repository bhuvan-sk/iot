import { Router } from 'express';
import { 
  getSensors, getSensorById, getSensorHistory, 
  getDevices, toggleDevice, getEsp32Status, 
  getAutomations, addAutomation, updateAutomation, deleteAutomation,
  getAlerts,
  receiveHeartbeat, receiveSensorData
} from '../controllers/iotController';

const router = Router();

router.get('/health', (req, res) => { res.json({ status: 'ok' }); });

router.get('/esp32/status', getEsp32Status);
router.post('/esp32/heartbeat', receiveHeartbeat);
router.post('/esp32/sensor-data', receiveSensorData);

router.get('/sensors', getSensors);
router.get('/sensors/:id', getSensorById);
router.get('/sensors/:id/history', getSensorHistory);

router.get('/devices', getDevices);
router.post('/devices/:id/toggle', toggleDevice);

router.get('/automations', getAutomations);
router.post('/automations', addAutomation);
router.put('/automations/:id', updateAutomation);
router.delete('/automations/:id', deleteAutomation);

router.get('/alerts', getAlerts);

export default router;
