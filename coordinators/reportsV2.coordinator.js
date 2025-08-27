import { parseFile } from "../utils/fileParser.utilV2.js";
import AgentReportUtil from "../utils/agentReport.util.js";
import Report from "../classes/report.class.js";
import ProcessorReportUtil from "../utils/processorReport.util.js";
import ArReportUtil from "../utils/arReport.util.js";
import ReportsV2M from "../models/reportsV2.model.js";
import AgentsModel from "../models/agents.model.js";
import ProcessorSummaryUtil from "../utils/processorSummary.util.js";
import BankSummaryUtil from "../utils/bankSummary.util.js";
import AgentSummaryUtil from "../utils/agentSummary.util.js";
import InvoicesModel from "../models/invoices.model.js";

export default class ReportsV2Coor {
  // General report functions
  // Get a report by ID
  static getReport = async (reportID) => {
    try {
      return await ReportsV2M.getReport(reportID);
    } catch (error) {
      throw new Error("Error getting report: " + error.message);
    }
  };

  // Get all reports of a certain type for an organization
  static getReports = async (organizationID, type) => {
    try {
      return await ReportsV2M.getReports(organizationID, type);
    } catch (error) {
      throw new Error("Error getting reports: " + error.message);
    }
  };

  // Get all reports for an organization
  static getAllReports = async (organizationID) => {
    try {
      return await ReportsV2M.getAllReports(organizationID);
    } catch (error) {
      throw new Error("Error getting all reports: " + error.message);
    }
  };

  // delete a report
  static deleteReport = async (reportID) => {
    try {
      return await ReportsV2M.deleteReport(reportID);
    } catch (error) {
      throw new Error("Error deleting report: " + error.message);
    }
  };

  // Add merchant to agent's list of clients when they are included in a split getMerchantByID
  static _backgroundAddOrRemoveMerchantToAgentsOnSplit = async (reportData) => {
    try {
      // console.log('orgID', reportData.organizationID);
      const organizationID = reportData.organizationID;
      await Promise.all(reportData.reportData.map(async merchant => {
        const merchantId = merchant['Merchant Id'];
        await AgentsModel.removeClientByMerchantIDFromSplit(merchantId);
        if (merchant.splits?.length > 0) {
          // console.log('merchant:', merchant);
          const { splits } = merchant;
          const { merchant: merchantInfo } = await AgentsModel.getMerchantByID(organizationID, merchantId);
          // console.log('merchantInfo: ', merchantInfo);
          await Promise.all(splits.map(async split => {
            await AgentsModel.addMerchantToAgentFromSplit(split.name, merchantInfo);
          }));
        }
      }));
    } catch (error) {
      throw new Error('Error adding merchant to agent: ' + error.message);
    }
  }

  // Update a report in the coordinator
  static updateReport = async (reportID, reportData) => {
    try {
      this._backgroundAddOrRemoveMerchantToAgentsOnSplit(reportData);
      // console.log(reportData);
      return await ReportsV2M.updateReport(reportID, reportData);
    } catch (error) {
      throw new Error('Error updating report: ' + error.message);
    }
  };

  // Update a specific merchant's data within a report
  static updateMerchantData = async (reportID, merchantId, merchantData) => {
    try {
      // Validate required fields
      if (!reportID || !merchantId || !merchantData) {
        throw new Error('Missing required fields: reportID, merchantId, and merchantData are required');
      }

      // Ensure merchantData is an object
      if (typeof merchantData !== 'object') {
        throw new Error('merchantData must be an object');
      }

      // Update the merchant data
      const updatedReport = await ReportsV2M.updateMerchantData(reportID, merchantId, merchantData);
      return updatedReport;
    } catch (error) {
      throw new Error('Error updating merchant data: ' + error.message);
    }
  };

  // Update merchant data by ID, month, organization, and processor
  static updateMerchantDataByID = async (merchantId, merchantData, monthYear, organizationID, processor) => {
    try {
      // Validate required fields
      if (!merchantId || !merchantData || !monthYear || !organizationID || !processor) {
        throw new Error('Missing required fields: merchantId, merchantData, monthYear, organizationID, and processor are required');
      }

      // Ensure merchantData is an object
      if (typeof merchantData !== 'object') {
        throw new Error('merchantData must be an object');
      }

      // Update the merchant data in all relevant reports for the specified month, organization, and processor
      const updatedReports = await ReportsV2M.updateMerchantDataByID(
        merchantId, 
        merchantData, 
        monthYear, 
        organizationID,
        processor
      );
      return updatedReports;
    } catch (error) {
      throw new Error('Error updating merchant data: ' + error.message);
    }
  };

  // Update report data by adding new merchant entries
  static updateReportData = async (organizationID, processor, monthYear, newMerchants) => {
    try {
      // Validate required fields
      if (!organizationID || !processor || !monthYear || !newMerchants) {
        throw new Error('Missing required fields: organizationID, processor, monthYear, and newMerchants are required');
      }

      // Ensure newMerchants is an array
      if (!Array.isArray(newMerchants)) {
        throw new Error('newMerchants must be an array');
      }

      // Update the report data by adding new merchants
      const updatedReports = await ReportsV2M.updateReportData(
        organizationID,
        processor,
        monthYear,
        newMerchants
      );
      return updatedReports;
    } catch (error) {
      throw new Error('Error updating report data: ' + error.message);
    }
  };

  // Update processor report data by adding new merchant entries to all processor reports
  static updateProcessorReportData = async (organizationID, newMerchants) => {
    try {
      // Validate required fields
      if (!organizationID || !newMerchants) {
        throw new Error('Missing required fields: organizationID and newMerchants are required');
      }

      // Ensure newMerchants is an array
      if (!Array.isArray(newMerchants)) {
        throw new Error('newMerchants must be an array');
      }

      // Process and format the merchant data
      const formattedMerchants = newMerchants.map(merchant => ({
        needsAudit: false,
        "Merchant Id": merchant["Merchant Id"],
        "Merchant Name": merchant["Merchant Name"],
        "Transaction": 0,
        "Sales Amount": 0,
        "Income": 0,
        "Expenses": 0,
        "Net": 0,
        "BPS": "0.00",
        "%": "0%",
        "Agent Net": 0,
        "Branch ID": merchant["Branch ID"],
        "approved": false
      }));

      // Update all processor reports for the organization
      const updatedReports = await ReportsV2M.updateProcessorReportData(
        organizationID,
        formattedMerchants
      );
      return updatedReports;
    } catch (error) {
      throw new Error('Error updating processor report data: ' + error.message);
    }
  };

  // Update report data by adding new merchant entries to all reports of specified type
  static updateReportDataByType = async (organizationID, type, newMerchants) => {
    try {
      // Validate required fields
      if (!organizationID || !type || !newMerchants) {
        throw new Error('Missing required fields: organizationID, type, and newMerchants are required');
      }

      // Ensure newMerchants is an array
      if (!Array.isArray(newMerchants)) {
        throw new Error('newMerchants must be an array');
      }

      // Process and format the merchant data based on type
      let formattedMerchants;
      
      if (type === 'processor') {
        formattedMerchants = newMerchants.map(merchant => ({
          needsAudit: false,
          "Merchant Id": merchant["Merchant Id"],
          "Merchant Name": merchant["Merchant Name"],
          "Transaction": 0,
          "Sales Amount": 0,
          "Income": 0,
          "Expenses": 0,
          "Net": 0,
          "BPS": "0.00",
          "%": "0%",
          "Agent Net": 0,
          "Branch ID": merchant["Branch ID"],
          "approved": false
        }));
      } else if (type === 'agent') {
        formattedMerchants = newMerchants.map(merchant => ({
          needsAudit: false,
          "Merchant Id": merchant["Merchant Id"],
          "Merchant Name": merchant["Merchant Name"],
          "Transaction": 0,
          "Sales Amount": 0,
          "Income": 0,
          "Expenses": 0,
          "Net": 0,
          "BPS": "0.00",
          "%": "0%",
          "Agent Net": 0,
          "Branch ID": merchant["Branch ID"],
          "approved": false
        }));
      } else if (type === 'ar') {
        formattedMerchants = newMerchants.map(merchant => ({
          needsAudit: false,
          "Merchant Id": merchant["Merchant Id"],
          "Merchant Name": merchant["Merchant Name"],
          "Transaction": 0,
          "Sales Amount": 0,
          "Income": 0,
          "Expenses": 0,
          "Net": 0,
          "BPS": "0.00",
          "%": "0%",
          "Agent Net": 0,
          "Branch ID": merchant["Branch ID"],
          "approved": false
        }));
      } else {
        // Default format for other types
        formattedMerchants = newMerchants.map(merchant => ({
          needsAudit: false,
          "Merchant Id": merchant["Merchant Id"],
          "Merchant Name": merchant["Merchant Name"],
          "Transaction": 0,
          "Sales Amount": 0,
          "Income": 0,
          "Expenses": 0,
          "Net": 0,
          "BPS": "0.00",
          "%": "0%",
          "Agent Net": 0,
          "Branch ID": merchant["Branch ID"],
          "approved": false
        }));
      }

      // Update all reports of the specified type for the organization
      const updatedReports = await ReportsV2M.updateReportDataByType(
        organizationID,
        type,
        formattedMerchants
      );
      return updatedReports;
    } catch (error) {
      throw new Error('Error updating report data by type: ' + error.message);
    }
  };

  // AR report functions
  // Create an AR report
  static createArReport = async (
    organizationID,
    processor,
    fileBuffer,
    mimetype,
    monthYear,
    userID
  ) => {
    try {
      const reports = [];
      let response = [];
      // Parse the file
      const csvData = await parseFile(fileBuffer, mimetype, processor);

      // console.log("csvData_create_ar_report", csvData);

      if (!csvData || csvData.length === 0) {
        throw new Error("Parsed data is empty. Please check the input file.");
      }

      if (processor === "PAAY" && !csvData[0].MID) {
        throw new Error(
          "PAAY report is missing required columns. Please check the input file."
        );
      } else if (processor === "accept.blue" && !csvData[0].Month) {
        throw new Error(
          "Accept.Blue report is missing required columns. Please check the input file."
        );
      }

      // Enrich CSV data with merchant splits
      const enrichedCSVData = await ReportsV2Coor.enrichCSVDataWithSplits(
        csvData,
        organizationID
      );

      // Check if a report already exists for this organization, processor, type, and month/year
      const billingReportExists = await ReportsV2M.reportExists(
        organizationID,
        processor,
        "billing",
        monthYear
      );
      if (billingReportExists) {
        throw new Error(
          `A ${processor} Billing Report for ${monthYear} already exists.`
        );
      }
      const billingReport = await ArReportUtil.buildBillingReport(
        organizationID,
        processor,
        monthYear,
        enrichedCSVData
      );

      // Add userID to billing report if provided
      if (userID) {
        billingReport.userID = userID;
      }

      reports.push(billingReport);
      // Check if an AR report already exists for this month and organization
      const arReport = await ReportsV2M.getARReport(organizationID, monthYear);
      const invoiveNum = await InvoicesModel.getInvoiceNum(organizationID);
      const invoiceCount = invoiveNum.number;

      if (arReport) {
        // Update the existing AR report with the new data
        const result = await ArReportUtil.updateARReport(
          processor,
          invoiceCount,
          arReport,
          enrichedCSVData
        );
        const updatedReport = result.arReport;
        const updatedInvoiceCount = result.invoiceCount;
        // Add userID to updated report if provided
        if (userID) {
          updatedReport.userID = userID;
        }
        await ReportsV2M.updateReport(updatedReport.reportID, updatedReport);
        await InvoicesModel.updateInvoiceNum(
          organizationID,
          updatedInvoiceCount
        );
        response[result.type] = updatedReport;
      } else {
        // Create a new AR report (e.g., for accept.blue)
        const result = await ArReportUtil.buildARReport(
          organizationID,
          processor,
          monthYear,
          invoiceCount,
          enrichedCSVData
        );
        const newReport = result.arReport;
        const newInvoiceCount = result.invoiceCount;
        // Add userID to new report if provided
        if (userID) {
          newReport.userID = userID;
        }
        await InvoicesModel.updateInvoiceNum(organizationID, newInvoiceCount);
        reports.push(newReport);
      }
      for (const report of reports) {
        const result = await ReportsV2M.createReport(report);
        if (result.acknowledged) {
          response.push(report);
        }
      }
      return response;
    } catch (error) {
      throw new Error("Error creating billing report: " + error.message);
    }
  };

  // Processor report functions
  // Create a processor report
  static async enrichCSVDataWithSplits(csvData, organizationID) {
    try {
      if (!Array.isArray(csvData)) {
        throw new Error("CSV data must be an array");
      }

      const enrichedData = await Promise.all(
        csvData.map(async (row) => {
          const merchantId = row["Merchant ID"] || "";

          if (!merchantId) {
            return {
              ...row,
              splits: [],
            };
          }

          try {
            const merchantData = await AgentsModel.getMerchantByID(
              organizationID,
              merchantId
            );
            const merchant = merchantData?.merchant || {};

            const splits = [];

            // Add partners if they exist
            if (Array.isArray(merchant.partners)) {
              splits.push(
                ...merchant.partners.map((partner) => ({
                  type: "partner",
                  name: partner?.name || "",
                  value:
                    typeof partner?.split === "string"
                      ? parseFloat(partner.split.replace("%", ""))
                      : partner?.split || 0,
                }))
              );
            }

            // Add reps if they exist
            if (Array.isArray(merchant.reps)) {
              splits.push(
                ...merchant.reps.map((rep) => ({
                  type: "rep",
                  name: rep?.name || "",
                  value:
                    typeof rep?.split === "string"
                      ? parseFloat(rep.split.replace("%", ""))
                      : rep?.split || 0,
                }))
              );
            }

            // Add agent if it exists
            if (Array.isArray(merchant.agent)) {
              splits.push(
                ...merchant.agent.map((agent) => ({
                  type: "agent",
                  name: agent?.name || "",
                  value:
                    typeof agent?.split === "string"
                      ? parseFloat(agent.split.replace("%", ""))
                      : agent?.split || 0,
                }))
              );
            }

            return {
              ...row,
              splits,
            };
          } catch (error) {
            console.error(`Error fetching merchant ${merchantId}:`, error);
            return {
              ...row,
              splits: [],
            };
          }
        })
      );

      return enrichedData;
    } catch (error) {
      console.error("Error in enrichCSVDataWithSplits:", error);
      throw new Error("Error enriching CSV data with splits: " + error.message);
    }
  }

  static createProcessorReport = async (
    organizationID,
    processor,
    fileBuffer,
    mimetype,
    monthYear,
    userID
  ) => {
    try {
      // Parse the file
      const csvData = await parseFile(fileBuffer, mimetype, processor);

      // console.log("csvData", csvData);

      const agents = await AgentsModel.getAgents(organizationID);
      if (!csvData || csvData.length === 0) {
        throw new Error("Parsed data is empty. Please check the input file.");
      }

      // Enrich CSV data with merchant splits
      const enrichedCSVData = await ReportsV2Coor.enrichCSVDataWithSplits(
        csvData,
        organizationID
      );

      // console.log("enrichedCSVData", enrichedCSVData);

      // Check if a report already exists for this organization, processor, type, and month/year
      let reportExists;
      // Check if building Line Item Deductions report
      if (processor === "Rectangle Health" || processor === "Hyfin") {
        reportExists = await ReportsV2M.reportExists(
          organizationID,
          "Line Item Deductions",
          "processor",
          monthYear
        );
        if (reportExists) {
          const report = await ReportsV2M.getProcessorReport(
            organizationID,
            "Line Item Deductions",
            monthYear
          );
          // Check if the processor is already in the report
          if (report.processors.includes(processor)) {
            throw new Error(
              `A ${processor} Report for ${monthYear} already was already added to the Line Item Deductions Processor Report.`
            );
          }
          // Update the existing report with the new processor data
          const updatedReport = await ProcessorReportUtil.updateProcessorReport(
            processor,
            report,
            agents,
            enrichedCSVData
          );
          // Add userID to updated report if provided
          if (userID) {
            updatedReport.userID = userID;
          }
          // Update the report in the database
          const result = await ReportsV2M.updateReport(
            report.reportID,
            updatedReport
          );
          // Check if the report was updated successfully
          if (result.reportID) {
            return updatedReport;
          }
        } else {
          // Create a new Line Item Deductions report
          const report = await ProcessorReportUtil.buildProcessorReport(
            organizationID,
            processor,
            monthYear,
            agents,
            enrichedCSVData
          );
          // Add userID to new report if provided
          if (userID) {
            report.userID = userID;
          }
          // Create the report in the database
          const result = await ReportsV2M.createReport(report);
          // Check if the report was created successfully
          if (result.acknowledged) {
            return report;
          } else {
            throw new Error("Error creating report: " + result.message);
          }
        }
      }
      // Check if stanaard processor report exists
      reportExists = await ReportsV2M.reportExists(
        organizationID,
        processor,
        "processor",
        monthYear
      );
      // if report exists,throw error
      if (reportExists) {
        throw new Error(
          `A ${processor} Processor Report for ${monthYear} already exists.`
        );
      }
      // Build the processor report
      const report = await ProcessorReportUtil.buildProcessorReport(
        organizationID,
        processor,
        monthYear,
        agents,
        enrichedCSVData
      );
      // Add userID to report if provided
      if (userID) {
        report.userID = userID;
      }
      // Create the report in the database
      const result = await ReportsV2M.createReport(report);
      // Check if the report was created successfully
      if (result.acknowledged) {
        return report;
      } else {
        throw new Error("Error creating report: " + result.message);
      }
    } catch (error) {
      throw new Error("Error creating processor report: " + error);
    }
  };

  // Agent report functions
  // Build an agent report
  static buildAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      const agent = await AgentsModel.getAgent(organizationID, agentID);
      if (!agent) {
        throw new Error("Agent not found");
      }
      // get processor reports
      const processorReports = await ReportsV2M.getProcessorReportsByMonth(
        organizationID,
        monthYear
      );
    
      if (!processorReports || processorReports.length === 0) {
        throw new Error("No processor reports found for this month/year.");
      }
      // build report
      const agentReport = AgentReportUtil.buildAgentReport(
        organizationID,
        monthYear,
        agent,
        processorReports
      );

      return agentReport;
    } catch (error) {
      throw new Error("Error creating agent report: " + error.message);
    }
  };

  // Get an agent report
  static getAgentReport = async (organizationID, agentID, monthYear) => {
    try {
      return await ReportsV2M.getAgentReport(
        organizationID,
        agentID,
        monthYear
      );
    } catch (error) {
      throw new Error("Error getting agent report: " + error.message);
    }
  };

  // Create an agent report
  static createAgentReport = async (organizationID, agentID, body) => {
    try {
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.agentReportExists(
        organizationID,
        agentID,
        monthYear
      );
      if (reportExists) {
        throw new Error(`An Agent Report for ${monthYear} already exists.`);
      }
      const agentReport = new Report(
        organizationID,
        "",
        "agent",
        monthYear,
        reportData
      );
      if (body.approved === true) {
        agentReport.approved = body.approved;
      }
      agentReport.agentID = agentID; // Add the agent ID to the report
      const result = await ReportsV2M.createReport(agentReport);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error("Error  report: " + result.message);
      }
    } catch (error) {
      throw new Error("Error creating agent report: " + error.message);
    }
  };

  // Agent Summary report functions
  // build an agent summary report
  static buildAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log(`Starting generation of agent summary report for Organization: ${organizationID}, Month-Year: ${monthYear} in the coordinator`);

      // Fetch agents for the organization
      // console.log(`Fetching agents for Organization: ${organizationID}`);
      const agents = await AgentsModel.getAgents(organizationID);
      if (!agents || agents.length === 0) {
        console.error(`No agents found for Organization: ${organizationID}`);
        throw new Error("No agents found for this organization.");
      }
      // console.log(`Successfully fetched ${agents.length} agents`);

      // Fetch processor reports for the given month/year
      // console.log(`Fetching processor reports for Organization: ${organizationID}, Month-Year: ${monthYear}`);
      const processorReports = await ReportsV2M.getProcessorReportsByMonth(
        organizationID,
        monthYear
      );
      // console.log('Processor Reports:', processorReports);
      if (!processorReports || processorReports.length === 0) {
        console.error(
          `No processor reports found for Organization: ${organizationID}, Month-Year: ${monthYear}`
        );
        throw new Error("No processor reports found for this month/year.");
      }
      // console.log(`Successfully fetched ${processorReports.length} processor reports`);

      // Build the agent summary report
      // console.log(`Building agent summary report for Organization: ${organizationID}, Month-Year: ${monthYear}`);
      const agentSummaryReport = AgentSummaryUtil.buildAgentSummaryReport(
        organizationID,
        monthYear,
        agents,
        processorReports
      );
      // console.log('Successfully built agent summary report');

      return agentSummaryReport;
    } catch (error) {
      console.error("Error building agent summary report:", error.message);
      throw new Error("Error building agent summary report: " + error.message);
    }
  };

  // Get an agent summary report
  static getAgentSummaryReport = async (organizationID, monthYear) => {
    try {
      return await ReportsV2M.getAgentSummaryReport(organizationID, monthYear);
    } catch (error) {
      throw new Error("Error getting agent summary report: " + error.message);
    }
  };

  // Create an agent summary report
  static createAgentSummaryReport = async (organizationID, body) => {
    try {
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      // console.log('Coordinator: Creating Agent Summary Report: ', organizationID, monthYear, reportData);
      const reportExists = await ReportsV2M.agentSummaryReportExists(
        organizationID,
        monthYear
      );

      if (reportExists) {
        throw new Error(`An Agent Report for ${monthYear} already exists.`);
      }
      const agentReport = new Report(
        organizationID,
        "",
        "agent summary",
        monthYear,
        reportData
      );
      if (body.approved === true) {
        agentReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(agentReport);
      // console.log('Coordinator: Agent Summary Report Result: ', result);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error("Error  report: " + result.message);
      }
    } catch (error) {
      throw new Error("Error creating agent summary report: " + error.message);
    }
  };

  // Processor Summary report functions
  // build a processor summary report
  static buildProcessorSummaryReport = async (organizationID, monthYear) => {
    try {
      // Retrieve processor reports for the specified organization and month/year
      const reports = await ReportsV2M.getProcessorReportsByMonth(
        organizationID,
        monthYear
      );
      if (!reports || reports.length === 0) {
        throw new Error("No processor reports found for this month/year.");
      }

      // Use the utility function to build the processor summary report
      const processorSummaryReport = ProcessorSummaryUtil.createProcessorReport(
        organizationID,
        monthYear,
        reports
      );
      // You can either save the summary report to the database here or return it
      return processorSummaryReport;
    } catch (error) {
      throw new Error(
        "Error building processor summary report: " + error.message
      );
    }
  };

  // Get a processor summary report
  static getProcessorSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log('Coordinator: Getting Processor Summary Report: ', organizationID, monthYear);
      return await ReportsV2M.getProcessorSummaryReport(
        organizationID,
        monthYear
      );
    } catch (error) {
      throw new Error(
        "Error getting processor summary report: " + error.message
      );
    }
  };

  // Create a processor summary report
  static createProcessorSummaryReport = async (organizationID, body) => {
    try {
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.processorSummaryReportExists(
        organizationID,
        monthYear
      );
      if (reportExists) {
        throw new Error(
          `A Processor Summary Report for ${monthYear} already exists.`
        );
      }
      const processorSummaryReport = new Report(
        organizationID,
        "",
        "processor summary",
        monthYear,
        reportData
      );
      if (body.approved === true) {
        processorSummaryReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(processorSummaryReport);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error(
          "Error creating processor summary report: " + result.message
        );
      }
    } catch (error) {
      throw new Error(
        "Error creating processor summary report: " + error.message
      );
    }
  };

  // Bank Summary report functions
  // build a bank summary report
  static buildBankSummaryReport = async (organizationID, monthYear) => {
    try {
      // Retrieve bank reports for the specified organization and month/year
      const reports = await ReportsV2M.getProcessorReportsByMonth(
        organizationID,
        monthYear
      );
      if (!reports || reports.length === 0) {
        throw new Error("No Processor reports found for this month/year.");
      }

      // Use the utility function to build the bank summary report
      // console.log('Building Bank Summary Report');
      const bankSummaryReport = BankSummaryUtil.buildBankSummaryReport(
        organizationID,
        monthYear,
        reports
      );
      // console.log('Bank Summary Report:', bankSummaryReport)
      // You can either save the summary report to the database here or return it
      return bankSummaryReport;
    } catch (error) {
      throw new Error("Error building bank summary report: " + error.message);
    }
  };

  // Get a bank summary report
  static getBankSummaryReport = async (organizationID, monthYear) => {
    try {
      // console.log('Coordinator: Getting Bank Summary Report: ', organizationID, monthYear);
      return await ReportsV2M.getBankSummaryReport(organizationID, monthYear);
    } catch (error) {
      throw new Error("Error getting bank summary report: " + error.message);
    }
  };

  // Create a bank summary report
  static createBankSummaryReport = async (organizationID, body) => {
    try {
      // console.log('Coordinator: Creating Bank Summary Report: ', organizationID, body);
      const monthYear = body.monthYear;
      const reportData = body.reportData;
      const reportExists = await ReportsV2M.bankSummaryReportExists(
        organizationID,
        monthYear
      );
      if (reportExists) {
        throw new Error(
          `A Bank Summary Report for ${monthYear} already exists.`
        );
      }
      const bankSummaryReport = new Report(
        organizationID,
        "",
        "bank summary",
        monthYear,
        reportData
      );
      if (body.approved === true) {
        bankSummaryReport.approved = body.approved;
      }
      const result = await ReportsV2M.createReport(bankSummaryReport);
      // console.log('Coordinator: Bank Summary Report Result: ', result);
      if (result.acknowledged) {
        return result;
      } else {
        throw new Error(
          "Error creating bank summary report: " + result.message
        );
      }
    } catch (error) {
      throw new Error("Error creating bank summary report: " + error.message);
    }
  };
}
