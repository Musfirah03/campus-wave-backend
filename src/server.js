require('dotenv').config();
const http       = require('http');
const app        = require('./app');
const connectDB  = require('./config/db');
const initSocket = require('./socket');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
const io = initSocket(httpServer);
app.locals.io = io;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
