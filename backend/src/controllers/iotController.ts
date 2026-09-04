import { Request, Response } from 'express';
import { sensors, sensorHistory, devices, esp32Status, automations, alerts, updateEsp32Status } from '../store/dataStore';
import { v4 as uuidv4 } from 'uuid';
import { Automation } from '../models/types';

export const getEsp32Status = (req: Request, res: Response) => {
  res.json(esp32Status);
};

export const getSensors = (req: Request, res: Response) => {
  res.json(sensors);
};

export const getSensorById = (req: Request, res: Response): void => {
  const sensor = sensors.find(s => s.id === req.params.id);
  if (sensor) {
    res.json(sensor);
  } else {
    res.status(404).json({ error: 'Sensor not found' });
  }
};

export const getSensorHistory = (req: Request, res: Response): void => {
  const history = sensorHistory[req.params.id];
  if (history) {
    res.json(history);
  } else {
    res.status(404).json({ error: 'Sensor history not found' });
  }
};

export const getDevices = (req: Request, res: Response) => {
  res.json(devices);
};

export const toggleDevice = (req: Request, res: Response): void => {
  const device = devices.find(d => d.id === req.params.id);
  if (device) {
    device.state = device.state === 'ON' ? 'OFF' : 'ON';
    res.json(device);
  } else {
    res.status(404).json({ error: 'Device not found' });
  }
};

export const getAutomations = (req: Request, res: Response) => {
  res.json(automations);
};

export const addAutomation = (req: Request, res: Response) => {
  const newAuto: Automation = {
    id: uuidv4(),
    name: req.body.name,
    trigger: req.body.trigger,
    action: req.body.action,
    enabled: req.body.enabled ?? true
  };
  automations.push(newAuto);
  res.status(201).json(newAuto);
};

export const updateAutomation = (req: Request, res: Response): void => {
  const index = automations.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    automations[index] = { ...automations[index], ...req.body };
    res.json(automations[index]);
  } else {
    res.status(404).json({ error: 'Automation not found' });
  }
};

export const deleteAutomation = (req: Request, res: Response): void => {
  const index = automations.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    automations.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Automation not found' });
  }
};

export const getAlerts = (req: Request, res: Response) => {
  res.json(alerts.filter(a => !a.dismissed));
};

export const receiveHeartbeat = (req: Request, res: Response) => {
  updateEsp32Status({ 
    lastHeartbeat: new Date().toISOString(),
    status: 'Online',
    ...req.body
  });
  res.json({ success: true });
};

export const receiveSensorData = (req: Request, res: Response): void => {
  const { deviceId, sensors: incomingSensors } = req.body;
  
  if (!incomingSensors || !Array.isArray(incomingSensors)) {
     res.status(400).json({ error: 'Invalid payload' });
     return;
  }

  const timestamp = new Date().toISOString();

  incomingSensors.forEach(incoming => {
    const sensor = sensors.find(s => s.id === incoming.id);
    if (sensor) {
      const reading = {
        id: uuidv4(),
        temperature: incoming.temperature,
        humidity: incoming.humidity,
        timestamp
      };
      
      sensor.lastReading = reading;
      
      if (!sensorHistory[sensor.id]) {
        sensorHistory[sensor.id] = [];
      }
      sensorHistory[sensor.id].push(reading);
      
      if (sensorHistory[sensor.id].length > 100) {
        sensorHistory[sensor.id].shift();
      }
    }
  });

  res.json({ success: true });
};
