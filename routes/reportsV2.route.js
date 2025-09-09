import express from 'express';
import ReportsV2Con from '../controllers/reportsV2.controller.js';
import multer from 'multer';

const reportR = express.Router();

// Multer configuration
const fileFilter = (req, file, cb) => {
  const validTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // For .xlsx
  ];

  if (validTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, XLSX, and XLSM files are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Adjust as necessary
  fileFilter: fileFilter
});

reportR.use((req, res, next) => {
  console.log(`reportsV2.route.js: Request received for path: ${req.path}`);
  next();
});


// Routes
  // Bulk upload reports
reportR.post('/organizations/:organizationID',
  upload.fields([
    { name: 'accept.blue', maxCount: 1 },
    { name: 'PAAY', maxCount: 1 },
    { name: 'Rectangle Health', maxCount: 1 },
    { name: 'Hyfin', maxCount: 1 },
    { name: 'Shift4', maxCount: 1 },
    { name: 'TRX', maxCount: 1 },
    { name: 'Merchant Lynx', maxCount: 1 },
    { name: 'Micamp', maxCount: 1 },
    { name: 'Global', maxCount: 1 },
    { name: 'Clearent', maxCount: 1 },
    { name: 'Payment Advisors', maxCount: 1 },
    { name: 'PayBright', maxCount: 1 },
    { name: 'Fiserv Omaha', maxCount: 1 },
    { name: 'Fiserv Bin & ICA', maxCount: 1 }
  ]),
  ReportsV2Con.createReports
);

// Bank Summary Report Routes
  // Build bank summary report
  // Get bank summary report
reportR.get('/organizations/:organizationID/bank-summary/:month/:year', ReportsV2Con.getBankSummaryReport);
reportR.post('/organizations/:organizationID/bank-summary', ReportsV2Con.buildBankSummaryReport);
  // Create bank summary report
reportR.post('/organizations/:organizationID/bank-summary/approve', ReportsV2Con.createBankSummaryReport);

  // Processor Summary Report Routes
    // Build processor summary report
    // Get processor summary report
reportR.get('/organizations/:organizationID/processor-summary/:month/:year', ReportsV2Con.getProcessorSummaryReport);
reportR.post('/organizations/:organizationID/processor-summary', ReportsV2Con.buildProcessorSummaryReport);
    // Create processor summary report
reportR.post('/organizations/:organizationID/processor-summary/approve', ReportsV2Con.createProcessorSummaryReport);

  // Agent Summary Report Routes
    // Build agent summary report
reportR.post('/organizations/:organizationID/agent-summary', ReportsV2Con.buildAgentSummaryReport);
    // Create agent summary report
reportR.post('/organizations/:organizationID/agent-summary/approve', ReportsV2Con.createAgentSummaryReport);
    // Get agent summary report
reportR.get('/organizations/:organizationID/agent-summary/:month/:year', ReportsV2Con.getAgentSummaryReport);
  // Agent Report Routes
    // Build agent report
reportR.post('/organizations/:organizationID/:agentID', ReportsV2Con.buildAgentReport);
    // Create agent report
reportR.post('/organizations/:organizationID/:agentID/agent-report', ReportsV2Con.createAgentReport);
    // Get agent report
reportR.get('/organizations/:organizationID/:agentID/:month/:year', ReportsV2Con.getAgentReport);


  // General Report Routes
    // get all reports for an organization
reportR.get('/organizations/:organizationID', ReportsV2Con.getAllReports);
    // get all reports of a specific type for an organization
reportR.get('/organizations/:organizationID/:type', ReportsV2Con.getReports);
    // get a specific report
reportR.get('/:reportID', ReportsV2Con.getReport);
    // delete a report
reportR.delete('/:reportID', ReportsV2Con.deleteReport);
    // update a report
reportR.put('/:reportID', ReportsV2Con.updateReport);
    // update merchant data by ID
reportR.put('/merchant/:merchantId', ReportsV2Con.updateMerchantDataByID);
    // update report data by adding new merchants to all reports of specified type
reportR.put('/organizations/:organizationID/update-report-data', ReportsV2Con.updateReportDataByType);

// Multer error handling middleware
reportR.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
  next();
});

export default reportR;
