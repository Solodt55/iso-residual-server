import { db } from '../lib/database.lib.js';
import Constants from '../lib/constants.lib.js';
import { report } from 'process';

export default class ReportsV2M {
  // General report functions
  // Get a report by ID
  static getReport = async (reportID) => {
    try {
      const report = await db.dbReports().findOne({ reportID }, { projection: Constants.DEFAULT_PROJECTION });
      return report;
    } catch (error) {
      throw new Error('Error getting report from DB: ' + error.message);
    }
  };
  // Get all reports of a certain type for an organization
  static getReports = async (organizationID, type, processor) => {
    try {
      const reports = await db.dbReports().find(
        processor ? { organizationID, processor } : { organizationID, type },
        { projection: Constants.DEFAULT_PROJECTION }
      ).toArray();
      return reports;
    } catch (error) {
      throw new Error('Error getting reports from DB: ' + error.message);
    }
  };
  // Get all reports for an organization by month
  static getProcessorReportsByMonth = async (organizationID, monthYear) => {
    try {
      const reports = await db.dbReports().find(
        {
          organizationID,
          type: 'processor',
          month: monthYear
        }, { projection: Constants.DEFAULT_PROJECTION }).toArray();
        // console.log('getProcessorReportsByMonth',reports);
      return reports;
    } catch (error) {
      throw new Error('Error getting reports from DB: ' + error.message);
    }
  };
  // Get all reports for an organization
  static getAllReports = async (organizationID) => {
    try {
      const reports = await db.dbReports().find({ organizationID }, { projection: Constants.DEFAULT_PROJECTION }).toArray();
      return reports;
    } catch (error) {
      throw new Error('Error getting all reports from DB: ' + error.message);
    }
  };
  // Update a report
  static updateReport = async (reportID, reportData) => {
    try {
      // Attempt to update the report
      const updatedReport = await db.dbReports().replaceOne({ reportID }, reportData);
      // console.log('reportID',reportID);

      // Check if a report was matched and modified
      if (!updatedReport.matchedCount) {
        throw new Error(`No report found with reportID: ${reportID}`);
      }
      if (!updatedReport.modifiedCount) {
        throw new Error(`Report with reportID: ${reportID} found but no changes were made.`);
      }

      // Return the updated data
      return reportData;
    } catch (error) {
      // Log the error with additional context for debugging
      console.error(`Failed to update report with reportID: ${reportID}`, {
        reportID,
        reportData,
        error: error.message,
      });
      throw new Error(`Error updating report with reportID: ${reportID} - ${error.message}`);
    }
  };

  // Delete a report
  static deleteReport = async (reportID) => {
    try {
      const deletedReport = await db.dbReports().deleteOne({ reportID });
      if (!deletedReport.deletedCount) {
        throw new Error('Report not found for deletion');
      }
      return { message: 'Report successfully deleted' };
    } catch (error) {
      throw new Error('Error deleting report: ' + error.message);
    }
  };
  // AR report functions
  // get an AR report
  static getARReport = async (organizationID, monthYear) => {
    try {
      // Find the AR report for the given organization and month/year
      const arReport = await db.dbReports().findOne({
        organizationID,
        type: 'ar',
        month: monthYear
      }, { projection: Constants.DEFAULT_PROJECTION });

      return arReport; // Return the AR report (if exists)
    } catch (error) {
      throw new Error('Error getting AR report from DB: ' + error.message);
    }
  };



  // Agent report functions
  // Get an agent report
  static getAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      return await db.dbReports().findOne({
        organizationID,
        type: 'agent',
        month: monthYear,
        agentID
      }, { projection: Constants.DEFAULT_PROJECTION });
    } catch (error) {
      throw new Error('Error getting agent report: ' + error.message);

    }
  };
  // Check if an agent report exists
  static agentReportExists = async (organizationID, agentID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        agentID,
        type: 'agent',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  // Processor report functions
  // Get a processor report
  static getProcessorReport = async (organizationID, processor, monthYear) => {
    try {
      // Find the AR report for the given organization and month/year
      const arReport = await db.dbReports().findOne({
        organizationID,
        processor,
        type: 'processor',
        month: monthYear
      }, { projection: Constants.DEFAULT_PROJECTION });

      return arReport; // Return the AR report (if exists)
    } catch (error) {
      throw new Error('Error getting AR report from DB: ' + error.message);
    }
  };
  // Check if a processor report exists
  static createReport = async (reportData) => {
    try {
      return db.dbReports().insertOne(reportData);
    } catch (error) {
      throw new Error('Error creating report: ' + error.message);
    }
  };

  // Proccessor Summary Report functions

  // Check if an processor summary report exists
  static processorSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        type: 'processor summary',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  static getProcessorSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log('Model: Getting Processor Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'processor summary', month: monthYear });
      // console.log('Processor Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting processor summary report: ' + error.message);
    };
  };

  // Proccessor Summary Report functions

  // Check if an bank summary report exists
  static bankSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        type: 'processor summary',
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  static getBankSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log('Model: Getting Bank Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'bank summary', month: monthYear });
      // console.log('Bank Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting bank summary report: ' + error.message);
    };
  };


  // agent summary report functions
  // Check if an agent summary report exists
  static agentSummaryReportExists = async (organizationID, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({ organizationID, type: 'agent summary', month: monthYear });
      return !!existingReport; // Return true if a report exists, false otherwise
    }
    catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  // Get an agent summary report
  static getAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log('Model: Getting Agent Summary Report: ', organizationID, monthYear);
      const report = await db.dbReports().findOne({ organizationID, type: 'agent summary', month: monthYear });
      // console.log('Agent Summary Report:', report);
      return report;
    } catch (error) {
      throw new Error('Error getting agent summary report: ' + error.message);
    }
  };


  // Utility functions
  // Get the next invoice number
  static invoiceNum = async (organizationID) => {
    try {
      const reports = await db.dbReports().find({ organizationID, type: 'ar' }).toArray();
      let invoiceNum = 0;
      reports.forEach(report => {
        invoiceNum += report.reportData.length;
      });
      return invoiceNum;
    } catch (error) {
      throw new Error('Error generating invoice number: ' + error.message);
    }
  };
  // Check if a report exists
  static reportExists = async (organizationID, processor, type, monthYear) => {
    try {
      const existingReport = await db.dbReports().findOne({
        organizationID,
        processor,
        type,
        month: monthYear
      });
      return !!existingReport; // Return true if a report exists, false otherwise
    } catch (error) {
      throw new Error('Error checking if report exists: ' + error.message);
    }
  };

  // Update a specific merchant's data within a report
  static updateMerchantData = async (reportID, merchantId, merchantData) => {
    try {
      // Find the report first
      const report = await db.dbReports().findOne({ reportID });
      if (!report) {
        throw new Error(`No report found with reportID: ${reportID}`);
      }

      // Find the merchant in reportData
      const merchantIndex = report.reportData.findIndex(
        merchant => merchant['Merchant Id'] === merchantId
      );

      if (merchantIndex === -1) {
        throw new Error(`No merchant found with ID: ${merchantId}`);
      }

      // Update the merchant data
      const updatedReport = await db.dbReports().updateOne(
        { reportID },
        { 
          $set: { 
            [`reportData.${merchantIndex}`]: {
              ...report.reportData[merchantIndex],
              ...merchantData
            }
          }
        }
      );

      if (!updatedReport.modifiedCount) {
        throw new Error('Failed to update merchant data');
      }

      return await db.dbReports().findOne({ reportID });
    } catch (error) {
      throw new Error(`Error updating merchant data: ${error.message}`);
    }
  };

  // Update merchant data by ID, month, organization, and processor
  static updateMerchantDataByID = async (merchantId, merchantData, monthYear, organizationID, processor) => {
    try {

      // console.log('merchantId',merchantId)
      // console.log('merchantData',merchantData)
      // console.log('monthYear',monthYear)
      // console.log('organizationID',organizationID)
      // console.log('processor',processor)
      // Find reports for the specific month, organization, and processor that contain this merchant
      const reports = await db.dbReports().find({
        organizationID,
        month: monthYear,
        processor,
        'reportData': {
          $elemMatch: {
            'Merchant Id': merchantId
          }
        }
      }).toArray();

      if (!reports || reports.length === 0) {
        // Try a more lenient search to debug
        const allReports = await db.dbReports().find({
          organizationID,
          month: monthYear,
          processor
        }).toArray();
        
        // console.log('All Reports for Month/Org/Processor:', JSON.stringify(allReports, null, 2));
        allReports.forEach(report => {
          if (Array.isArray(report.reportData)) {
            report.reportData.forEach(row => {
              // console.log('[DEBUG] (All) DB Merchant Id:', row['Merchant Id'], '| Type:', typeof row['Merchant Id'], '| Length:', row['Merchant Id'] ? row['Merchant Id'].length : 'undefined');
            });
          }
        });
        // console.log('[DEBUG] (All) Query Merchant Id:', merchantId, '| Type:', typeof merchantId, '| Length:', merchantId.length);
        throw new Error(`No merchant found with ID: ${merchantId} for month: ${monthYear} in organization: ${organizationID} and processor: ${processor}`);
      }

      // Update each report that contains this merchant
      const updatePromises = reports.map(async (report) => {
        const merchantIndex = report.reportData.findIndex(
          merchant => merchant['Merchant Id'] === merchantId
        );

        if (merchantIndex !== -1) {
          return db.dbReports().updateOne(
            { _id: report._id },
            {
              $set: {
                [`reportData.${merchantIndex}`]: {
                  ...report.reportData[merchantIndex],
                  ...merchantData
                }
              }
            }
          );
        }
      });

      await Promise.all(updatePromises.filter(Boolean));
      return reports;
    } catch (error) {
      throw new Error(`Error updating merchant data: ${error.message}`);
    }
  };

  // Update report data by adding new merchant entries
  static updateReportData = async (organizationID, processor, monthYear, newMerchants) => {
    try {
      // Find the report for the specific month, organization, and processor
      const report = await db.dbReports().findOne({
        organizationID,
        month: monthYear,
        processor,
        type: 'processor'
      });

      if (!report) {
        throw new Error(`No processor report found for month: ${monthYear} in organization: ${organizationID} and processor: ${processor}`);
      }

      // Get existing merchant IDs to avoid duplicates
      const existingMerchantIds = report.reportData.map(merchant => merchant['Merchant Id']);
      
      // Filter out merchants that already exist in the report
      const merchantsToAdd = newMerchants.filter(merchant => 
        !existingMerchantIds.includes(merchant['Merchant Id'])
      );

      if (merchantsToAdd.length === 0) {
        return {
          message: 'All merchants already exist in the report',
          report: report,
          addedCount: 0
        };
      }

      // Add new merchants to the report data
      const updatedReport = await db.dbReports().updateOne(
        { _id: report._id },
        {
          $push: {
            reportData: { $each: merchantsToAdd }
          }
        }
      );

      if (!updatedReport.modifiedCount) {
        throw new Error('Failed to update report data');
      }

      // Return the updated report
      const updatedReportData = await db.dbReports().findOne({ _id: report._id });
      return {
        message: `Successfully added ${merchantsToAdd.length} new merchants to the report`,
        report: updatedReportData,
        addedCount: merchantsToAdd.length,
        addedMerchants: merchantsToAdd
      };
    } catch (error) {
      throw new Error(`Error updating report data: ${error.message}`);
    }
  };

  // Update processor report data by adding new merchant entries to all processor reports
  static updateProcessorReportData = async (organizationID, newMerchants) => {
    try {
      // Find all processor reports for the organization
      const reports = await db.dbReports().find({
        organizationID,
        type: 'processor'
      }).toArray();

      if (!reports || reports.length === 0) {
        throw new Error(`No processor reports found for organization: ${organizationID}`);
      }

      const results = [];

      // Update each processor report
      for (const report of reports) {
        // Get existing merchant IDs to avoid duplicates
        const existingMerchantIds = report.reportData.map(merchant => merchant['Merchant Id']);
        
        // Filter out merchants that already exist in this report
        const merchantsToAdd = newMerchants.filter(merchant => 
          !existingMerchantIds.includes(merchant['Merchant Id'])
        );

        if (merchantsToAdd.length > 0) {
          // Add new merchants to the report data
          const updatedReport = await db.dbReports().updateOne(
            { _id: report._id },
            {
              $push: {
                reportData: { $each: merchantsToAdd }
              }
            }
          );

          if (updatedReport.modifiedCount) {
            // Get the updated report
            const updatedReportData = await db.dbReports().findOne({ _id: report._id });
            results.push({
              reportID: report.reportID,
              processor: report.processor,
              month: report.month,
              message: `Successfully added ${merchantsToAdd.length} new merchants`,
              addedCount: merchantsToAdd.length,
              addedMerchants: merchantsToAdd
            });
          }
        } else {
          results.push({
            reportID: report.reportID,
            processor: report.processor,
            month: report.month,
            message: 'All merchants already exist in this report',
            addedCount: 0
          });
        }
      }

      return {
        message: `Updated ${reports.length} processor reports`,
        totalReports: reports.length,
        results: results
      };
    } catch (error) {
      throw new Error(`Error updating processor report data: ${error.message}`);
    }
  };

  // Update report data by adding new merchant entries to all reports of specified type
  static updateReportDataByType = async (organizationID, type, newMerchants) => {
    try {
      // Find all reports of the specified type for the organization
      const reports = await db.dbReports().find({
        organizationID,
        type: type
      }).toArray();

      if (!reports || reports.length === 0) {
        throw new Error(`No ${type} reports found for organization: ${organizationID}`);
      }

      const results = [];

      // Update each report of the specified type
      for (const report of reports) {
        // Get existing merchant IDs to avoid duplicates
        const existingMerchantIds = report.reportData.map(merchant => merchant['Merchant Id']);
        
        // Filter out merchants that already exist in this report
        const merchantsToAdd = newMerchants.filter(merchant => 
          !existingMerchantIds.includes(merchant['Merchant Id'])
        );

        if (merchantsToAdd.length > 0) {
          // Add new merchants to the report data
          const updatedReport = await db.dbReports().updateOne(
            { _id: report._id },
            {
              $push: {
                reportData: { $each: merchantsToAdd }
              }
            }
          );

          if (updatedReport.modifiedCount) {
            // Get the updated report
            const updatedReportData = await db.dbReports().findOne({ _id: report._id });
            results.push({
              reportID: report.reportID,
              processor: report.processor || 'N/A',
              month: report.month,
              message: `Successfully added ${merchantsToAdd.length} new merchants`,
              addedCount: merchantsToAdd.length,
              addedMerchants: merchantsToAdd
            });
          }
        } else {
          results.push({
            reportID: report.reportID,
            processor: report.processor || 'N/A',
            month: report.month,
            message: 'All merchants already exist in this report',
            addedCount: 0
          });
        }
      }

      return {
        message: `Updated ${reports.length} ${type} reports`,
        totalReports: reports.length,
        reportType: type,
        results: results
      };
    } catch (error) {
      throw new Error(`Error updating ${type} report data: ${error.message}`);
    }
  };

}
