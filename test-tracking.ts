
import { WebSocket } from 'ws';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/tracking';
const WS_URL = 'ws://localhost:5000/ws';
const API_KEY = 'API-T3ST';

async function testTracking() {
  console.log('Starting tracking test...');

  // 1. Connect to WebSocket
  const ws = new WebSocket(WS_URL);
  
  const wsPromise = new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('WebSocket connected');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'vehicles') {
        console.log('Received vehicle update via WebSocket:', message.data.length, 'vehicles');
        // Check if our test vehicle is updated
        const testVehicle = message.data.find((v: any) => v.licensePlate === 'TEST-001');
        if (testVehicle) {
          console.log('Test vehicle found in update:', testVehicle);
          resolve(true);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      reject(err);
    });
  });

  // 2. Send Tracking Data
  const trackingPayload = {
    licensePlate: 'TEST-001',
    latitude: -23.550520,
    longitude: -46.633308,
    speed: 60,
    heading: 90,
    timestamp: new Date().toISOString(),
    ignition: "on"
  };

  console.log('Sending tracking data:', trackingPayload);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(trackingPayload)
    });

    const result = await response.json();
    console.log('Tracking API response:', response.status, result);

    if (response.status !== 200) {
      throw new Error(`API returned ${response.status}`);
    }

  } catch (error) {
    console.error('Error sending tracking data:', error);
  }

  // Wait for WebSocket update
  try {
    await Promise.race([
      wsPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for WebSocket update')), 5000))
    ]);
    console.log('Test PASSED: WebSocket update received after tracking data sent.');
  } catch (error) {
    console.error('Test FAILED:', error);
  } finally {
    ws.close();
  }
}

testTracking();
