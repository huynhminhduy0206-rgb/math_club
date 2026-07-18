import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const expressApp = express();
const port = 3000;

// Get the current directory name of main.js safely in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

expressApp.use('/base', express.static(path.join(__dirname, '../base')));
expressApp.use('/pages', express.static(path.join(__dirname, '../pages')));
expressApp.use('/css', express.static(path.join(__dirname, '../css')));

expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../pages/auth.html'));
});

expressApp.listen(port, () => {
  console.log(`This app is listening on port ${port}`);
});