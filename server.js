const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

app.use(express.static(rootDir));

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});