const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/live');
ws.on('open', () => { console.log('connected'); setTimeout(() => ws.close(), 1000); });
ws.on('error', (e) => { console.error('error', e.message); });
ws.on('close', () => { console.log('closed'); });
ws.on('message', (m) => { console.log('msg', m.toString().substring(0, 50)); });
