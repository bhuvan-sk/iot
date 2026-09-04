import axios from 'axios';
import type { Sensor, Device, ESP32Status, Automation, Alert, SensorReading } from '../types';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const getEsp32Status = async (): Promise<ESP32Status> => {
  const res = await api.get('/esp32/status');
  return res.data;
};

export const getSensors = async (): Promise<Sensor[]> => {
  const res = await api.get('/sensors');
  return res.data;
};

export const getSensorHistory = async (id: string): Promise<SensorReading[]> => {
  const res = await api.get(`/sensors/${id}/history`);
  return res.data;
};

export const getDevices = async (): Promise<Device[]> => {
  const res = await api.get('/devices');
  return res.data;
};

export const toggleDevice = async (id: string): Promise<Device> => {
  const res = await api.post(`/devices/${id}/toggle`);
  return res.data;
};

export const getAutomations = async (): Promise<Automation[]> => {
  const res = await api.get('/automations');
  return res.data;
};

export const getAlerts = async (): Promise<Alert[]> => {
  const res = await api.get('/alerts');
  return res.data;
};
