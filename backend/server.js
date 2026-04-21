const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Vercel Siap!', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Backend Uang Kasbon is Running');
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log('Server on ' + PORT));
}

module.exports = app;
