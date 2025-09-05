import Report from "../classes/report.class.js";
import processorTypeMap from "../lib/typeMap.lib.js";
import Type1Row from "../classes/type1Row.class.js";
import Type2Row from "../classes/type2Row.class.js";
import Type3Row from "../classes/type3Row.class.js";
import Type4Row from "../classes/type4Row.class.js";
export default class AgentReportUtil {
  static buildAgentReport = (
    organizationID,
    monthYear,
    agent,
    processorReports
  ) => {
    try {
      // Build report data
      const reportData = buildAgentReportData(agent, processorReports);

      // Build report
      const agentReport = new Report(
        organizationID,
        "",
        "agent",
        monthYear,
        reportData
      );

      return agentReport;
    } catch (error) {
      console.error("Error creating agent report:", error);
      throw new Error("Error creating agent report: " + error.message);
    }
  };
}

const buildAgentReportData = (agent, processorReports) => {
  try {
    // Ensure the inputs are valid
    if (!Array.isArray(agent.clients) || !Array.isArray(processorReports)) {
      throw new Error(
        "Invalid input: agentClients or processorReports is not an array"
      );
    }

    // console.log('processorReports', JSON.stringify(processorReports, null, 2));


    // Build the agent report data by filtering each processor's report data
    const agentReportData = processorReports.map((report) => ({
      processor: report.processor,
      reportData: buildProcessorReportData(report, agent),
    }));

    return agentReportData;
  } catch (error) {
    console.error("Error building agent report data:", error);
    throw new Error("Error building agent report data: " + error.message);
  }
};

const buildProcessorReportData = (report, agent) => {
  try {
    //console.log('Processing report for processor:', report.processor);
    //console.log('First row of report data structure:', report.reportData[0]); // Log the first row to inspect its structure



    const agentClients = agent.clients;

    // Ensure the report data and agent clients are valid
    if (!report || !Array.isArray(report.reportData)) {
      throw new Error(
        "Invalid report data: report or reportData is missing or not an array"
      );
    }
    if (!Array.isArray(agentClients)) {
      throw new Error("Invalid agent clients: agentClients is not an array");
    }

    // Create a map of clients by their Merchant ID for fast lookup, converting all to strings
    const clientMap = new Map(
      agentClients.map((client) => [String(client.merchantID), client]) // Ensure all merchant IDs are strings
    );
    //console.log('clientMap:', clientMap);

    // Filter report data to include only rows where the Merchant ID exists in the agent's clients
    const filteredReportData = report.reportData.filter((row) => {
      const merchantId = String(row["Merchant Id"]); // Ensure the Merchant Id from the report is treated as a string
      const hasClient = clientMap.has(merchantId);

      return hasClient;
    });

    //console.log('Filtered report data:', filteredReportData); // Log filtered data

    const type = processorTypeMap[report.processor];

    // Build the final report data with the necessary fields and calculations
    const finalReportData = filteredReportData.map((row) => {
      // console.log('am I in finalReportData map')
      const client = clientMap.get(String(row["Merchant Id"])); // Use string comparison
      console.log("the client:", client);
      console.log("the row:", row);
      let finalReportRow, agentSplit;
      switch (client.partner) {
        case "SIB":
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else {
            agentSplit = 0.6;
          }
          break;
        case "HBS":
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else {
            agentSplit = 0.4;
          }
          break;
        case "PharmaTrust":
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else if (
            typeof agent.agentSplit === "string" &&
            agent.agentSplit.includes("%")
          ) {
            agentSplit = parseFloat(agent.agentSplit) / 100;
            // console.log(
            //   `Default case (percentage string): agentSplit parsed from "${agent.agentSplit}" → ${agentSplit}`
            // );
          } else if (typeof agent.agentSplit === "number") {
            agentSplit = agent.agentSplit;
            // console.log(`Default case (number): agentSplit → ${agentSplit}`);
          } else {
            console.warn(
              `Default case (invalid agentSplit): "${agent.agentSplit}" → fallback to 0.4`
            );
            agentSplit = "0%";
          }
          break;
        case "Jonathan Mosley":
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else {
            agentSplit = 0.7;
          }
          break;
        case "CasTech":
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else {
            agentSplit = 0.5;
          }
          break;
        default:
          // agentSplit = agent.agentSplit;
          // break;
          // console.log("agent:", agent);
          if (client.splitPercentage) {
            agentSplit =  parseFloat(client.splitPercentage) / 100;
          } else if (
            typeof agent.agentSplit === "string" &&
            agent.agentSplit.includes("%")
          ) {
            agentSplit = parseFloat(agent.agentSplit) / 100;
            // console.log(
            //   `Default case (percentage string): agentSplit parsed from "${agent.agentSplit}" → ${agentSplit}`
            // );
          } else if (typeof agent.agentSplit === "number") {
            agentSplit = agent.agentSplit;
            // console.log(`Default case (number): agentSplit → ${agentSplit}`);
          } else {
            console.warn(
              `Default case (invalid agentSplit): "${agent.agentSplit}" → fallback to 0.4`
            );
            agentSplit = "0%";
          }
          break;
      }

      // Use Branch ID from processor report, fallback to client.branchID if not available
      const branchID = row["Branch ID"] || (client.partner ? client.branchID : "");

      const convertToPercentage = (value) => {
        const percentage = value * 100;
        return `${percentage}%`;
      };

      // Handle different processor types based on type
      switch (type) {
        case "type1":
          finalReportRow = {
            "Merchant Id": row["Merchant Id"],
            "Merchant Name": row["Merchant Name"],
            Transaction: row["Transaction"],
            "Sales Amount": row["Sales Amount"],
            Income: row["Income"],
            Expenses: row["Expenses"],
            Net: row["Net"],
            BPS: row["BPS"],
            "Agent Split": convertToPercentage(agentSplit),
            "Agent Net": row["Net"] * agentSplit,
            "Branch ID": branchID,
            splits: row.splits || [],
            approved: row.approved || false
          };
          break;

        case "type2":
          finalReportRow = {
            "Merchant Id": row["Merchant Id"],
            "Merchant Name": row["Merchant Name"],
            "Payout Amount": row["Payout Amount"],
            Volume: row["Volume"],
            Sales: row["Sales"],
            Refunds: row["Refunds"],
            "Reject Amount": row["Reject Amount"],
            "Agent Split": convertToPercentage(agentSplit),
            "Agent Net": row["Payout Amount"] * agentSplit,
            "Branch ID": branchID,
            splits: row.splits || [],
            approved: row.approved || false
          };
          break;

        case "type3":
          finalReportRow = {
            "Merchant Id": row["Merchant Id"],
            "Merchant DBA": row["Merchant DBA"],
            "Payout Amount": row["Payout Amount"],
            Volume: row["Volume"],
            Sales: row["Sales"],
            "Agent Split": convertToPercentage(agentSplit),
            "Agent Net": row["Payout Amount"] * agentSplit,
            "Branch ID": branchID,
            splits: row.splits || [],
            approved: row.approved || false
          };
          break;

        case "type4":
          finalReportRow = {
            "Merchant Id": row["Merchant Id"],
            "Merchant Name": row["Merchant Name"],
            Net: row["Net"],
            "Agent Split": convertToPercentage(agentSplit),
            "Agent Net": row["Net"] * agentSplit,
            "Branch ID": branchID,
            splits: row.splits || [],
            approved: row.approved || false
          };
          break;

        case "type5":
          finalReportRow = {
            "Merchant Id": row["Merchant Id"],
            "Merchant Name": row["Merchant Name"],
            Transaction: row["Transaction"],
            "Sales Amount": row["Sales Amount"],
            Income: row["Income"],
            Expenses: row["Expenses"],
            Net: row["Net"],
            BPS: row["BPS"],
            "Agent Split": convertToPercentage(agentSplit),
            "Agent Net": row["Net"] * agentSplit,
            "Branch ID": branchID,
            splits: row.splits || [],
            approved: row.approved || false
          };
          break;    
      }

      return finalReportRow;
    });

    return finalReportData;
  } catch (error) {
    console.error("Error building processor report data:", error);
    throw new Error("Error building processor report data: " + error.message);
  }
};
