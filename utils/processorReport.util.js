import Type1Row from "../classes/type1Row.class.js";
import Type2Row from "../classes/type2Row.class.js";
import Type3Row from "../classes/type3Row.class.js";
import Type4Row from "../classes/type4Row.class.js";
import Type5Row from "../classes/type5Row.class.js";
import Report from "../classes/report.class.js";
import processorTypeMap from "../lib/typeMap.lib.js";
import ReportsV2M from "../models/reportsV2.model.js";
import { db } from "../lib/database.lib.js";

export default class ProcessorReportUtil {
    static buildProcessorReport = async (organizationID, processor, monthYear, agents, csvData) => {
        try {
            // build processor report
            // build branchIDMap
            const branchIDMap = await buildBranchIDMap(agents);
            // build processor rows
            const procRowsArray = await buildProcRows(processor, csvData, branchIDMap, organizationID);
            const type = 'processor';
            // check if processor is Rectangle Health or Hyfin
            if (processor === 'Rectangle Health' || processor === 'Hyfin') {
                // build Line Item Deductions report
                const report = new Report(
                    organizationID,
                    'Line Item Deductions',
                    type,
                    monthYear,
                    procRowsArray
                );
                report.processors.push(processor);
                return report;
            };
            // build standard processor report
            const report = new Report(
                organizationID,
                processor,
                type,
                monthYear,
                procRowsArray
            );
            // add processor to report
            report.processors.push(processor)
            // return report
            return report;
        } catch (error) {
            throw new Error('Error building processor report: ' + error.message);
        };
    };

    static updateProcessorReport = async (processor, processorReport, agents, csvData, organizationID) => {
        try {
            // build branchIDMap
            const branchIDMap = await buildBranchIDMap(agents);
            // build processor rows
            const result = await buildProcRows(processor, csvData, branchIDMap, organizationID);
            // add rows to report
            result.forEach(row => {
                processorReport.reportData.push(row);
            });
            // add processor to report
            processorReport.processors.push(processor);
            // return updated report
            return processorReport;
        } catch (error) {
            throw new Error('Error updating AR Report: ' + error.message);
        }
    };
};

const buildProcRows = async (processor, csvData, branchIDMap, organizationID) => {
    try {
        const procRowsArray = [];
        // get processor type
        let lidReports, dbaMap;
        const processorType = processorTypeMap[processor];
        if (processor === 'Rectangle Health') {
            lidReports = await ReportsV2M.getReports(organizationID, 'processor', 'Line Item Deductions');
            dbaMap = {};
            lidReports.forEach(report => {
                report.reportData.forEach(row => {
                    if (row['approved'] === true) {
                        dbaMap[row['Merchant Name']] = row['Merchant Id'];
                    };
                });
            });
        };
        csvData.forEach(row => {
            let procRow, bankSplit = 0, branchID, needsAudit;

            // Normalize Merchant ID
            let merchantID = row['Merchant ID'] || row['Merchant Id'] || row['MID'] || row['Client']
                ? String(row['Merchant ID'] || row['Merchant Id'] || row['MID'] || row['Client'])
                    .trim() // Remove surrounding whitespace
                    .replace(/'/g, '') // Remove single quotes
                : null;

            // Normalize Merchant ID
            const merchantName = row['Merchant'] || row['Merchant Name'] || row['Dba'] || row['Name']
                ? String(row['Merchant'] || row['Merchant Name'] || row['Dba'] || row['Name']).trim()
                : null;

            if (!merchantID || merchantName === 'CLIENT LEVEL EXPENSE') {
                return; // Skip invalid or unnecessary rows
            };

            // Determine if Merchant ID exists in branchIDMap
            needsAudit = !branchIDMap.hasOwnProperty(merchantID);

            // Assign default values for missing BranchID
            if (!branchIDMap[merchantID] || !branchIDMap[merchantID].branchID) {
                branchID = '';
                bankSplit = 0;
            } else {
                branchID = branchIDMap[merchantID].branchID;
                bankSplit = 0.35;
            };

            // Get splits from the row if they exist
            const splits = row.splits || [];

            switch (processorType) {
                case 'type1':
                    console.log('type1');
                    procRow = new Type1Row(
                        merchantID,  // trim to handle spaces
                        merchantName,
                        row['Transactions'],
                        row['Sales Amount'],
                        row['Income'],
                        row['Expenses'],
                        row['Net'],
                        row['BPS'],
                        bankSplit,
                        branchID, // Ensure branchIDMap is correctly mapped
                        needsAudit,
                        splits
                    );
                    break;
                case 'type2':
                    console.log('type2');
                    procRow = new Type2Row(
                        merchantID,        // Correctly named
                        merchantName,      // Correctly named
                        row['Payout Amount'],      // Updated to match parsed data
                        row['Volume'],             // Correctly named
                        row['Sales'],              // Correctly named
                        row['Refunds'],            // Correctly named
                        row['Reject Amount'],      // Correctly named
                        bankSplit,
                        branchID,  // Mapping the correct Merchant ID to branchID
                        needsAudit,
                        splits
                    );
                    break;
                case 'type3':
                    console.log('type3');
                    procRow = new Type3Row(
                        merchantID,
                        merchantName,
                        row['Agent Residual'],
                        row['Sale Amount'],
                        row['Sale Count'],
                        bankSplit,
                        branchID,
                        needsAudit,
                        splits
                    );
                    break;
                case 'type4':
                    console.log('type4');
                    if (processor === 'Rectangle Health') {
                        // Get DBA from dbaMap
                        if (dbaMap[merchantName]) {
                            merchantID = dbaMap[merchantName];
                            needsAudit = false;
                        };
                        procRow = new Type4Row(
                            merchantID,  // trim to handle spaces
                            merchantName,
                            row['Billing Amount'],
                            bankSplit,
                            branchID,
                            needsAudit,
                            splits
                        );
                    } else {
                        if (merchantID === 'Totals') {
                            console.log('Row is empty');
                            return;
                        }

                        procRow = new Type4Row(
                            merchantID,
                            merchantName,
                            row['TOTAL FEES'],
                            bankSplit,
                            branchID,
                            needsAudit,
                            splits
                        );
                    };
                    break;
                case 'type5':
                    console.log('type5');
                    // // For PayBright, read '%' from file but use Branch ID from agents data like other processors
                    // const bankSplitFromFile = row['%'] ? parseFloat(row['%']) / 100 : 0.35;

                    procRow = new Type5Row(
                        merchantID,  // trim to handle spaces
                        merchantName,
                        row['Transactions'],
                        row['Sales Amount'],
                        row['Income'],
                        row['Expenses'],
                        row['Net'],
                        row['BPS'],
                        bankSplit, // Use '%' from file
                        branchID, // Use Branch ID from agents data like other processors
                        needsAudit,
                        splits
                    );
                    break;
                default:
                    throw new Error('Processor type not found');
            };
            procRowsArray.push(procRow);
        });
        return procRowsArray;
    } catch (error) {
        throw new Error('Error building processor rows: ' + error.message);
    }
};

const buildBranchIDMap = async (agents) => {
    try {
        const branchIDMap = {};
        // map branchID to merchantID
        agents.forEach(agent => {
            // check if agent has clients
            if (agent.clients) {
                agent.clients.forEach(client => {
                    branchIDMap[client.merchantID] = { branchID: client.branchID, dba: client.merchantName };
                    return;
                });
            };
        });
        // return branchIDMap
        return branchIDMap;
    } catch (error) {
        throw new Error('Error building branchIDMap: ' + error.message);
    };
};


