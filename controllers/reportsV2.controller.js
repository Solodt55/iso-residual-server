import ReportsV2Coor from '../coordinators/reportsV2.coordinator.js';
import processorTypeMap from '../lib/typeMap.lib.js';

export default class ReportsV2Con {
  // General report functions
    // Get a report by ID
  static getReport = async (req, res, next) => {
    try {
      const report = await ReportsV2Coor.getReport(req.params.reportID);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  };
  
    // Get all reports of a certain type for an organization
  static getReports = async (req, res, next) => {
    try {
      const reports = await ReportsV2Coor.getReports(req.params.organizationID, req.params.type);
      if (!reports || reports.length === 0) {
        return res.status(404).json({ message: 'No reports found' });
      }
      return res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  };

  // Get all reports of a certain type for a user in an organization
  static getUsersProcessorReports = async (req, res, next) => {
    try {
      const userID = req.user?.userID || null;
      const reports = await ReportsV2Coor.getUsersProcessorReports(req.params.organizationID, userID);
      if (!reports || reports.length === 0) {
        return res.status(404).json({ message: 'No user reports found' });
      }
      return res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  };

    // Get all reports for an organization
  static getAllReports = async (req, res, next) => {
    try {
      const reports = await ReportsV2Coor.getAllReports(req.params.organizationID);
      if (!reports || reports.length === 0) {
        return res.status(404).json({ message: 'No reports found' });
      }
      return res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  };

    // Get all reports for a user in an organization
    static getAllUsersReports = async (req, res) => {
    try {
      const { organizationID } = req.params;
      
      // Get userID from JWT token (added by middleware)
      const userID = req.user?.userID || null;
      const isAdmin = req.user?.isAdmin || false;
      
      // Pass userID to coordinator (null for admins to get all data)
      const reports = await ReportsV2Coor.getAllUsersReports(organizationID, isAdmin ? null : userID);
      
      res.status(200).json(reports);
    } catch (error) {
      console.error('Error getting user reports:', error);
      res.status(500).json({ message: error.message });
    }
  };

    // bulk create reports
  static createReports = async (req, res, next) => {
    try {
      console.log('Creating reports - starting process');
      const files = req.files;
      const organizationID = req.params.organizationID;
      
      console.log('Files received:', Object.keys(files));
      
      let userID = null;

      if(req.body.userID){
         userID = req.body.userID;
      }

      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      const reportPromises = [];
      const processors = Object.keys(files);

      // Special handling for PayBright
      if (processors.includes('PayBright') && processors.length === 1) {
        console.log('Processing PayBright report specifically');
        console.log('PayBright file size:', files['PayBright'][0].size);
        console.log('PayBright mimetype:', files['PayBright'][0].mimetype);
      }

      for (const processor of processors) {
        const fileBuffer = files[processor][0].buffer;
        const fileSize = files[processor][0].size;
        const mimetype = files[processor][0].mimetype;
        const monthYear = `${req.body.month} ${req.body.year}`;

        console.log(`Processing file for ${processor}:`, {
          fileSize,
          mimetype,
          monthYear
        });

        // Check if the file is in a valid format
        if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimetype)) {
          return res.status(400).json({ message: `Invalid file format for ${processor}` });
        }

        // Check if file has content
        if (fileSize === 0) {
          return res.status(400).json({ message: `Empty file uploaded for ${processor}` });
        }

        try {
          let promise;
          if (processor === 'accept.blue' || processor === 'PAAY') {
            console.log(`Creating AR report for ${processor}`);
            // Handle Type 1 processors (accept.blue, PAAY)
            promise = await ReportsV2Coor.createArReport(organizationID, processor, fileBuffer, mimetype, monthYear, userID);
          } else {
            console.log(`Creating processor report for ${processor}`);
            promise = await ReportsV2Coor.createProcessorReport(organizationID, processor, fileBuffer, mimetype, monthYear, userID);
          }
          reportPromises.push(promise);
        } catch (processorError) {
          console.error(`Error processing ${processor} report:`, processorError);
          // Check if this is a duplicate report error
          if (processorError.message && processorError.message.includes('duplicate key')) {
            return res.status(409).json({ 
              message: `A report for ${processor} in ${req.body.month} ${req.body.year} already exists. Please delete it first.`,
              processor
            });
          } else {
            throw processorError; // Re-throw to be caught by outer catch
          }
        }
      }
      
      const results = await Promise.all(reportPromises);
      const reports = [];
      for (const result of results) {
        reports.push(result[0]);
        if (result[1]) {
          reports.push(result[1]);
        }
      }
      
      if (reports.length === 0) {
        return res.status(400).json({ message: 'Reports not created' });
      } else {
        return res.status(200).json({ message: 'Reports created successfully', reports });
      }
    } catch (error) {
      console.error('Error creating reports:', error);
      if (error.name === 'MongoServerError' && error.code === 11000) {
        // MongoDB duplicate key error
        return res.status(409).json({ 
          message: 'A report for this month and year already exists. Please delete it first.',
          error: error.message 
        });
      }
      next(error);
    }
  };

    // Delete a report by ID
  static deleteReport = async (req, res, next) => {
    try {
      const report = await ReportsV2Coor.deleteReport(req.params.reportID);
      if (!report) {
        return res.status(404).json({ message: 'Report not deleted' });
      }
      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  };
// Update a report by ID
static updateReport = async (req, res, next) => {
  try {
      // Log the request details
      // console.log("Reports Controller: Initiating report update");
      // console.log("Report ID:", req.params.reportID);
      // console.log("Report Data:", req.body);

      // Call the coordinator to update the report
      const report = await ReportsV2Coor.updateReport(req.params.reportID, req.body);

      // Check if the report was successfully updated
      if (!report) {
          console.warn(`Reports Controller: No report found to update with reportID: ${req.params.reportID}`);
          return res.status(404).json({ message: `Report with ID ${req.params.reportID} not found for update` });
      }

      // Log the successful update and respond
      // console.log(`Reports Controller: Successfully updated report with ID: ${req.params.reportID}`);
      return res.status(200).json(report);
  } catch (error) {
      // Log the error with full context
      console.error(`Reports Controller: Error updating report with ID: ${req.params.reportID}`, {
          reportID: req.params.reportID,
          requestData: req.body,
          error: error.message,
      });

      // Pass the error to the next middleware for standardized error handling
      next(error);
  }
};

  // Update merchant data by ID, month, organization, and processor
  static updateMerchantDataByID = async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { merchantData, monthYear, organizationID, processor } = req.body;

      // console.log('merchantId',merchantId);
      // console.log('req.body',req.body);
      // return false;

      if (!monthYear || !organizationID || !processor) {
        return res.status(400).json({ 
          error: 'monthYear, organizationID, and processor are required in request body' 
        });
      }

      const updatedReports = await ReportsV2Coor.updateMerchantDataByID(
        merchantId, 
        merchantData, 
        monthYear, 
        organizationID,
        processor
      );
      res.json(updatedReports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update report data by adding new merchant entries to all reports of specified type
  static updateReportDataByType = async (req, res) => {
    try {
      const { organizationID } = req.params;
      const { type, newMerchants } = req.body;

      if (!type || !newMerchants || !Array.isArray(newMerchants)) {
        return res.status(400).json({ 
          error: 'type and newMerchants (array) are required in request body' 
        });
      }

      const updatedReports = await ReportsV2Coor.updateReportDataByType(
        organizationID,
        type,
        newMerchants
      );
      res.json(updatedReports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update processor report data by adding new merchant entries to all processor reports
  static updateProcessorReportData = async (req, res) => {
    try {
      const { organizationID } = req.params;
      const { newMerchants } = req.body;

      if (!newMerchants || !Array.isArray(newMerchants)) {
        return res.status(400).json({ 
          error: 'newMerchants (array) is required in request body' 
        });
      }

      const updatedReports = await ReportsV2Coor.updateProcessorReportData(
        organizationID,
        newMerchants
      );
      res.json(updatedReports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Agent Report functions
    // Build agent report
  static buildAgentReport = async (req, res, next) => {
    try {
      const agentReport = await ReportsV2Coor.buildAgentReport(req.params.organizationID, req.params.agentID, req.body.monthYear);
      // console.log(JSON.stringify(agentReport, null, 2));
      if (!agentReport) {
        return res.status(404).json({ message: 'Agent report not found' });
      }
      return res.status(200).json(agentReport);
    } catch (error) {
      next(error);
    }
  };

  // Agent Report functions
    // Build agent report
  static buildUsersAgentReport = async (req, res, next) => {
    try {
      if (!req.user.isAdmin) {
        console.log(`req.user: `, JSON.stringify(req.user, null, 2));
        console.log(`req.user.agentID: ${req.user.userID}`);
        console.log(`req.params.agentID: ${req.params.agentID}`);
        if (req.user.userID !== req.params.agentID) {
          return res.status(403).json({ message: 'Forbidden: You do not have access to build this agent report' });
        }
      }
      const agentReport = await ReportsV2Coor.buildAgentReport(req.params.organizationID, req.params.agentID, req.body.monthYear);
      // console.log(JSON.stringify(agentReport, null, 2));
      if (!agentReport) {
        return res.status(404).json({ message: 'Agent report not found' });
      }
      return res.status(200).json(agentReport);
    } catch (error) {
      next(error);
    }
  };

  // Get agent report
  static getAgentReport = async (req, res, next) => {
    try {
      const monthYear = `${req.params.month} ${req.params.year}`;
      // console.log(`[AgentReport] Fetching report for Month Year: ${monthYear}`);
      const agentReport = await ReportsV2Coor.getAgentReport(req.params.organizationID, req.params.agentID, monthYear);

      // console.log(JSON.stringify(agentReport, null, 2));

      
      if (!agentReport || agentReport.length === 0) {
          // console.log(`[AgentReport] No report found for organizationID: ${req.params.organizationID}, agentID: ${req.params.agentID}, monthYear: ${monthYear}`);
          return res.status(204).json({ 
              message: 'No agent reports found',
              organizationID: req.params.organizationID,
              agentID: req.params.agentID,
              monthYear
          });
      }
      // console.log(`[AgentReport] Report found:`, agentReport);
      return res.status(200).json(agentReport);

    } catch (error) {
      console.error(`[AgentReport] Error fetching report:`, error);
      next(error);
    }
  };

  // Get users agent report
  static getUsersAgentReport = async (req, res, next) => {
    try {
      if (!req.user.isAdmin) {
        if (req.user.userID !== req.params.agentID) {
          return res.status(403).json({ message: 'Forbidden: You do not have access to view this agent report' });
        }
      }
      const monthYear = `${req.params.month} ${req.params.year}`;
      // console.log(`[AgentReport] Fetching report for Month Year: ${monthYear}`);
      const agentReport = await ReportsV2Coor.getAgentReport(req.params.organizationID, req.params.agentID, monthYear);

      // console.log(JSON.stringify(agentReport, null, 2));

      
      if (!agentReport || agentReport.length === 0) {
          // console.log(`[AgentReport] No report found for organizationID: ${req.params.organizationID}, agentID: ${req.params.agentID}, monthYear: ${monthYear}`);
          return res.status(204).json({ 
              message: 'No agent reports found',
              organizationID: req.params.organizationID,
              agentID: req.params.agentID,
              monthYear
          });
      }
      // console.log(`[AgentReport] Report found:`, agentReport);
      return res.status(200).json(agentReport);

    } catch (error) {
      console.error(`[AgentReport] Error fetching report:`, error);
      next(error);
    }
  };
  

    // Create agent report
  static createAgentReport = async (req, res, next) => {
    try {
      const agentReport = await ReportsV2Coor.createAgentReport(req.params.organizationID, req.params.agentID, req.body);
      if (!agentReport.acknowledged) {
        return res.status(404).json({ message: 'Agent report not created' });
      }
      return res.status(200).json(agentReport);
    } catch (error) {
      next(error);
    }
  };

  // Processor Summary Report functions
    // Build processor summary report
  static buildProcessorSummaryReport = async (req, res, next) => {
    try {
      // console.log('Building Processor Report: ', req.params.organizationID, req.body.monthYear);
      const processorReport = await ReportsV2Coor.buildProcessorSummaryReport(req.params.organizationID,req.body.monthYear);
      if (!processorReport) {
        return res.status(404).json({ message: 'Processor report not found' });
      }
      return res.status(200).json(processorReport);
    } catch (error) {
      next(error);
    }
  };
  
      // Create processor summary report
  static createProcessorSummaryReport = async (req, res, next) => {
    try {
      // console.log('Reports Controller: Creating Processor Summary Report');
      const processorReport = await ReportsV2Coor.createProcessorSummaryReport(req.params.organizationID, req.body);
      if (!processorReport.acknowledged) {
        return res.status(404).json({ message: 'Processor report not created' });
      }
      return res.status(200).json(processorReport);
    } catch (error) {
      next(error);
    }
  };

      // Get processor summary report
  static getProcessorSummaryReport = async (req, res, next) => {
    try {
      // console.log('Reports Controller: Getting Processor Summary Report');
      const monthYear = `${req.params.month} ${req.params.year}`;
      // console.log('Month Year:', monthYear);
      // console.log('Organization ID:', req.params.organizationID);
      const processorReport = await ReportsV2Coor.getProcessorSummaryReport(req.params.organizationID, monthYear);
      // console.log('Processor Report:', processorReport);
      if (!processorReport || processorReport.length === 0) {
        return res.status(404).json({ message: 'No processor reports found' });
      }
      return res.status(200).json(processorReport);
    } catch (error) {
      next(error);
    }
  };

  // Agent Summary Report functions
    // Build agent summary report
  static buildAgentSummaryReport = async (req, res, next) => {
    try {
      const agentSummaryReport = await ReportsV2Coor.buildAgentSummaryReport(req.params.organizationID, req.body.monthYear);
      if (!agentSummaryReport) {
        return res.status(404).json({ message: 'Agent summary report not found' });
      }
      return res.status(200).json(agentSummaryReport);
    } catch (error) {
      next(error);
    }
  };
  
      // Create agent summary report
  static createAgentSummaryReport = async (req, res, next) => {
    try {
      // console.log('Reports Controller: Creating Agent Summary Report', req.params.organizationID, req.body);
      const agentSummaryReport = await ReportsV2Coor.createAgentSummaryReport(req.params.organizationID, req.body);
      if (!agentSummaryReport.acknowledged) {
        return res.status(404).json({ message: 'Agent summary report not created' });
      }
      return res.status(200).json(agentSummaryReport);
    } catch (error) {
      next(error);
    }
  };
  
        // Get agent summary report
  static getAgentSummaryReport = async (req, res, next) => {
    try {
      const monthYear = `${req.params.month} ${req.params.year}`;
      // console.log('Month Year:', monthYear);
      const agentSummaryReport = await ReportsV2Coor.getAgentSummaryReport(req.params.organizationID, monthYear);
      // console.log('Agent Summary Report:', agentSummaryReport);
      if (!agentSummaryReport || agentSummaryReport.length === 0) {
        return res.status(404).json({ message: 'No agent summary reports found' });
      }
      return res.status(200).json(agentSummaryReport);
    } catch (error) {
      next(error);
    }
  };







  
  
  // Processor Summary Report functions
    // Build processor summary report
    static buildBankSummaryReport = async (req, res, next) => {
      // console.log(req.body);
      // return false;
      try {
        // console.log('Building Bank Report: ', req.params.organizationID, req.body.monthYear);
        const processorReport = await ReportsV2Coor.buildBankSummaryReport(req.params.organizationID,req.body.monthYear);
        if (!processorReport) {
          return res.status(404).json({ message: 'Processor report not found' });
        }
        return res.status(200).json(processorReport);
      } catch (error) {
        next(error);
      }
    };
    
        // Create processor summary report
    static createBankSummaryReport = async (req, res, next) => {
      try {
        // console.log('Reports Controller: Creating Bank Summary Report');
        const processorReport = await ReportsV2Coor.createBankSummaryReport(req.params.organizationID, req.body);
        if (!processorReport.acknowledged) {
          return res.status(404).json({ message: 'Bank report not created' });
        }
        return res.status(200).json(processorReport);
      } catch (error) {
        next(error);
      }
    };
  
        // Get processor summary report
    static getBankSummaryReport = async (req, res, next) => {
      try {
        // console.log('Reports Controller: Getting Bank Summary Report');
        const monthYear = `${req.params.month} ${req.params.year}`;
        // console.log('Month Year:', monthYear);
        // console.log('Organization ID:', req.params.organizationID);
        const processorReport = await ReportsV2Coor.getBankSummaryReport(req.params.organizationID, monthYear);
        // console.log('Bank Report:', processorReport);
        if (!processorReport || processorReport.length === 0) {
          return res.status(204).json({ message: 'No processor reports found' });
        }
        return res.status(200).json(processorReport);
      } catch (error) {
        next(error);
      }
    };
}
