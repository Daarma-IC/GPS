const express = require('express');
const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

const serialPort = new SerialPort({
  path: 'COM3',      // atau port yang sesuai
  baudRate: 115200,  // SAMA dengan di Arduino
});
// Parser per baris
const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

serialPort.on('error', (err) => {
  console.error('SerialPort error:', err.message);
});

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Setiap ada satu baris dari Arduino
parser.on('data', (line) => {
  const gpsData = line.toString().trim();
  console.log('Data received from Arduino:', gpsData);

  // Kirim ke frontend hanya kalau formatnya JSON (mulai dengan '{')
  if (gpsData.startsWith('{')) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(gpsData);
      }
    });
  } else {
    // Baris non-JSON bisa di-log saja
    console.log('Non-JSON line (ignored):', gpsData);
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
