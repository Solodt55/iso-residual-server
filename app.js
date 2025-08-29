// import packages
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import config from 'config';
import https from 'https';
import http from 'http';
import fs from 'fs';
// import routes
import AgentsRoute from './routes/agents.route.js';
import ReportsV2Route from './routes/reportsV2.route.js';
import reportR from './routes/reports.route.js';
import authR from './routes/auth.route.js';
import userRouter from './routes/users.route.js';
import webhooksRouter from './routes/webhooks.route.js';
// import middleware
import { isAdmin } from './middleware/admin.middleware.js';
// import db
import { db } from './lib/database.lib.js';
import invoicesRoute from './routes/invoices.route.js';
import DashboardRoute from './routes/dashboard.route.js';

// dotenv config
dotenv.config();

// setupe express
const app = express()
const port = 3003;
const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
};

// setup middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(config.get('cors')));

//set up routes
app.use('/api/v1/reports', reportR);
app.use('/api/v2/reports', ReportsV2Route);
app.use('/api/v2/auth', authR);
app.use('/api/v2/users', isAdmin, userRouter);
app.use('/api/v2/agents', isAdmin, AgentsRoute);
app.use('/api/v2/invoices', isAdmin, invoicesRoute);
app.use('/api/v2/dashboard', DashboardRoute);
app.use('/api/v2/webhooks', webhooksRouter);

// setup db
db.init(config.get('mongo'));

// start server
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// })
https.createServer(options, app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});