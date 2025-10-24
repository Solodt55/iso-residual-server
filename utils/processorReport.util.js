import Type1Row from "../classes/type1Row.class.js";
import Type2Row from "../classes/type2Row.class.js";
import Type3Row from "../classes/type3Row.class.js";
import Type4Row from "../classes/type4Row.class.js";
import Type5Row from "../classes/type5Row.class.js";
import Report from "../classes/report.class.js";
import processorTypeMap from "../lib/typeMap.lib.js";
import ReportsV2M from "../models/reportsV2.model.js";
import AgentsModel from "../models/agents.model.js";
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
        
        console.log(`[BuildProcRows] Starting to process ${csvData.length} rows for processor: ${processor}`);
        console.log(`[BuildProcRows] Processor type: ${processorType}`);
        console.log(`[BuildProcRows] Organization ID: ${organizationID}`);
        console.log(`[BuildProcRows] Sample input data (first 3 rows):`, csvData.slice(0, 3));
        console.log(`[BuildProcRows] BranchIDMap keys count:`, Object.keys(branchIDMap).length);
        console.log(`[BuildProcRows] BranchIDMap sample:`, Object.keys(branchIDMap).slice(0, 5));
        
        try {
            const procRowsArray = await Promise.all(
                csvData.map(async (row, index) => {
                    try {
                        console.log(`\n[BuildProcRows] Processing row ${index + 1}/${csvData.length}`);
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

                        console.log(`[BuildProcRows] Row ${index + 1} - Merchant ID: ${merchantID}, Merchant Name: ${merchantName}`);

                        if (!merchantID || merchantName === 'CLIENT LEVEL EXPENSE') {
                            console.log(`[BuildProcRows] Row ${index + 1} - SKIPPING: Invalid merchant ID or CLIENT LEVEL EXPENSE`);
                            console.log(`[BuildProcRows] Row ${index + 1} - SKIP REASON: merchantID="${merchantID}", merchantName="${merchantName}"`);
                            return null; // Skip invalid or unnecessary rows
                        };

                        // Determine if Merchant ID exists in branchIDMap
                        needsAudit = !branchIDMap.hasOwnProperty(merchantID);
                        console.log(`[BuildProcRows] Row ${index + 1} - Needs audit: ${needsAudit}`);

                        // Assign default values for missing BranchID
                        if (!branchIDMap[merchantID] || !branchIDMap[merchantID].branchID) {
                            branchID = '';
                            bankSplit = 0;
                            console.log(`[BuildProcRows] Row ${index + 1} - No branch mapping found, using defaults`);
                        } else {
                            branchID = branchIDMap[merchantID].branchID;
                            bankSplit = 0.35;
                            console.log(`[BuildProcRows] Row ${index + 1} - Found branch mapping: ${branchID}, bankSplit: ${bankSplit}`);
                        };

                        // Get splits from the row if they exist
                        console.log(`[BuildProcRows] Row ${index + 1} - Fetching agent splits for merchant: ${merchantID}`);
                        try {
                            const splits = await AgentsModel.getAgentsMerchantSplitsByMerchantID(organizationID, merchantID) || [];
                            console.log(`[BuildProcRows] Row ${index + 1} - Found ${splits.length} agent splits:`, splits);

                            console.log(`[BuildProcRows] Row ${index + 1} - Processing as ${processorType}`);
                            
                            switch (processorType) {
                                case 'type1':
                                    console.log(`[BuildProcRows] Row ${index + 1} - Creating Type1Row`);
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
                                    console.log(`[BuildProcRows] Row ${index + 1} - Creating Type2Row`);
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
                                    console.log(`[BuildProcRows] Row ${index + 1} - Creating Type3Row`);
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
                                    console.log(`[BuildProcRows] Row ${index + 1} - Creating Type4Row`);
                                    if (processor === 'Rectangle Health') {
                                        // Get DBA from dbaMap
                                        if (dbaMap[merchantName]) {
                                            merchantID = dbaMap[merchantName];
                                            needsAudit = false;
                                            console.log(`[BuildProcRows] Row ${index + 1} - Rectangle Health: Updated merchantID from dbaMap: ${merchantID}`);
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
                                            console.log(`[BuildProcRows] Row ${index + 1} - SKIPPING: Totals row`);
                                            return null;
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
                                    console.log(`[BuildProcRows] Row ${index + 1} - Creating Type5Row (PayBright)`);
                                    // For PayBright, read '%' from file and calculate Agent Net
                                    const bankSplitFromFile = row['%'] ? parseFloat(row['%']) / 100 : 0.35;
                                    console.log(`[BuildProcRows] Row ${index + 1} - PayBright bankSplit from file: ${row['%']} -> ${bankSplitFromFile}`);
                                    
                                    // Calculate Agent Net by multiplying Net by the percentage
                                    const netValue = parseFloat(row['Net']) || 0;
                                    const calculatedAgentNet = netValue * bankSplitFromFile;
                                    console.log(`[BuildProcRows] Row ${index + 1} - PayBright calculation: ${netValue} * ${bankSplitFromFile} = ${calculatedAgentNet}`);

                                    procRow = new Type5Row(
                                        merchantID,  // trim to handle spaces
                                        merchantName,
                                        row['Transactions'],
                                        row['Sales Amount'],
                                        row['Income'],
                                        row['Expenses'],
                                        calculatedAgentNet, // Use calculated Agent Net instead of raw Net
                                        row['BPS'],
                                        bankSplitFromFile, // Use '%' from file
                                        branchID, // Use Branch ID from agents data like other processors
                                        needsAudit,
                                        splits
                                    );
                                    break;
                                default:
                                    console.log(`[BuildProcRows] Row ${index + 1} - ERROR: Unknown processor type: ${processorType}`);
                                    throw new Error('Processor type not found');
                            };
                            
                            console.log(`[BuildProcRows] Row ${index + 1} - Successfully created procRow for ${merchantName}`);
                            return procRow;
                        } catch (splitsError) {
                            console.error(`[BuildProcRows] Row ${index + 1} - Error fetching splits or creating row:`, splitsError);
                            console.error(`[BuildProcRows] Row ${index + 1} - Merchant ID: ${merchantID}, Organization ID: ${organizationID}`);
                            console.error(`[BuildProcRows] Row ${index + 1} - Full row data:`, JSON.stringify(row, null, 2));
                            console.error(`[BuildProcRows] Row ${index + 1} - CRITICAL: This row will be LOST due to splits error`);
                            // Return null instead of throwing to prevent Promise.all from failing
                            return null;
                        }
                    } catch (rowError) {
                        console.error(`[BuildProcRows] Row ${index + 1} - Error processing row:`, rowError);
                        console.error(`[BuildProcRows] Row ${index + 1} - Row data:`, row);
                        console.error(`[BuildProcRows] Row ${index + 1} - CRITICAL: This row will be LOST due to processing error`);
                        // Return null instead of throwing to prevent Promise.all from failing
                        return null;
                    }
                })
            );            
            console.log(`[BuildProcRows] Promise.all completed. Processing ${procRowsArray.length} results`);
            
            // Enhanced debugging to track missing rows
            let nullCount = 0;
            let undefinedCount = 0;
            let validCount = 0;
            let errorRows = [];
            
            procRowsArray.forEach((row, index) => {
                if (row === null) {
                    nullCount++;
                    console.log(`[BuildProcRows] Row ${index + 1} returned NULL - likely skipped or errored`);
                } else if (row === undefined) {
                    undefinedCount++;
                    console.log(`[BuildProcRows] Row ${index + 1} returned UNDEFINED`);
                } else {
                    validCount++;
                }
            });
            
            console.log(`[BuildProcRows] SUMMARY - Total processed: ${procRowsArray.length}`);
            console.log(`[BuildProcRows] SUMMARY - Valid rows: ${validCount}`);
            console.log(`[BuildProcRows] SUMMARY - NULL rows (skipped/errored): ${nullCount}`);
            console.log(`[BuildProcRows] SUMMARY - UNDEFINED rows: ${undefinedCount}`);
            console.log(`[BuildProcRows] SUMMARY - Success rate: ${((validCount / procRowsArray.length) * 100).toFixed(2)}%`);
            
            // Filter out any null or undefined rows (e.g., skipped rows). Since we are using map instead of forEach now
            console.log('about to return valid rows');
            const validRows = procRowsArray.filter(row => row !== null && row !== undefined);
            console.log(`valid rows length: ${validRows.length}`);
            console.log(`valid rows sample:`, validRows.slice(0, 2));
            
            // Log if there's a significant difference between input and output
            if (csvData.length !== validRows.length) {
                console.warn(`[BuildProcRows] WARNING: Input had ${csvData.length} rows but only ${validRows.length} valid rows returned`);
                console.warn(`[BuildProcRows] WARNING: ${csvData.length - validRows.length} rows were lost during processing`);
            }
            
            return validRows;
        } catch (promiseError) {
            console.error('[BuildProcRows] Error in Promise.all:', promiseError);
            throw promiseError;
        }
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


