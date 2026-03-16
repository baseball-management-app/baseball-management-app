const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;

console.log('[boot] server.js loaded');
console.log('[boot] __dirname =', rootDir);
console.log('[boot] PORT =', process.env.PORT);
console.log('[boot] NODE_ENV =', process.env.NODE_ENV);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

app.use((req, res, next) => {
  console.log(`[request] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  console.log('[health] OK');
  res.status(200).json({ ok: true });
});

app.use(express.static(rootDir));

app.get('/', (req, res) => {
  const filePath = path.join(rootDir, 'index.html');
  console.log('[route /] sendFile =', filePath);
  res.sendFile(filePath);
});

app.listen(port, host, () => {
  console.log(`[listen] Server is running on http://${host}:${port}`);
});