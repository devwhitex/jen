const https = require('https');

const TARGET_URL = 'https://jen-bot-3geq.onrender.com/';

function sendPing() {
  const req = https.get(TARGET_URL, (res) => {
    console.log(`[${new Date().toISOString()}] Keep-Alive Ping Sent! HTTP Status: ${res.statusCode}`);
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Ping error: ${err.message}`);
  });

  req.setTimeout(10000, () => {
    req.destroy();
  });
}

// Immediate initial ping
sendPing();

// Ping every 5 minutes (300,000 ms) to prevent Render from going idle
setInterval(sendPing, 300000);
