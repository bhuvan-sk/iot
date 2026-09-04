import { sensors, sensorHistory, devices, esp32Status, updateEsp32Status, alerts } from '../store/dataStore';
import { v4 as uuidv4 } from 'uuid';

let mockInterval: NodeJS.Timeout | null = null;
const MAX_HISTORY = 100; // Store up to 100 historical readings per sensor

function generateReading(baseTemp: number, baseHum: number) {
  const tempVariance = (Math.random() * 2) - 1; // +/- 1 degree
  const humVariance = (Math.random() * 5) - 2.5; // +/- 2.5 %
  
  return {
    temperature: parseFloat((baseTemp + tempVariance).toFixed(1)),
    humidity: parseFloat((baseHum + humVariance).toFixed(1)),
  };
}

const baseValues: Record<string, { t: number, h: number }> = {
  'dht-living': { t: 27.0, h: 60.0 },
  'dht-bedroom': { t: 25.5, h: 55.0 },
  'dht-kitchen': { t: 29.0, h: 70.0 },
};

export function startMockService() {
  if (mockInterval) return;

  console.log('Starting MOCK_MODE: Generating simulated ESP32 data...');

  // Initialize history for the last 60 minutes
  const now = Date.now();
  for (const sensor of sensors) {
    for (let i = 60; i >= 0; i--) {
       const readingTime = new Date(now - i * 60 * 1000).toISOString();
       const base = baseValues[sensor.id] || { t: 25, h: 50 };
       const reading = generateReading(base.t, base.h);
       
       sensorHistory[sensor.id].push({
         id: uuidv4(),
         ...reading,
         timestamp: readingTime
       });
       
       // Update current
       sensor.lastReading = {
         id: uuidv4(),
         ...reading,
         timestamp: readingTime
       };
    }
  }

  mockInterval = setInterval(() => {
    // Simulate Heartbeat
    updateEsp32Status({
      lastHeartbeat: new Date().toISOString(),
      wifiSignal: -50 - Math.floor(Math.random() * 20)
    });

    // Simulate Sensor Readings
    const timestamp = new Date().toISOString();
    sensors.forEach(sensor => {
      const base = baseValues[sensor.id] || { t: 25, h: 50 };
      const reading = generateReading(base.t, base.h);
      
      const newReading = {
        id: uuidv4(),
        ...reading,
        timestamp
      };

      sensor.lastReading = newReading;
      sensorHistory[sensor.id].push(newReading);
      
      if (sensorHistory[sensor.id].length > MAX_HISTORY) {
        sensorHistory[sensor.id].shift(); // Remove oldest
      }

      // Basic alert simulation
      if (reading.humidity > 75 && sensor.id === 'dht-kitchen') {
         sensor.status = 'Warning';
         if (!alerts.find(a => a.message === 'Kitchen humidity reached 75%+')) {
             alerts.unshift({
                 id: uuidv4(),
                 message: 'Kitchen humidity reached 75%+',
                 type: 'warning',
                 timestamp: new Date().toISOString(),
                 dismissed: false
             });
         }
      } else if (reading.humidity <= 75 && sensor.id === 'dht-kitchen') {
         sensor.status = 'Normal';
      }
    });

  }, 5000); // update every 5 seconds
}

export function stopMockService() {
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
}
