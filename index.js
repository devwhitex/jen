// Entry point forwarding to src/index.js
try {
  require('./src/index.js');
} catch (err) {
  console.error('[FATAL STARTUP ERROR]:', err);
  process.exit(1);
}
