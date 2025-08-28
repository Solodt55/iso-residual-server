import Report from "../classes/report.class.js";
import processorTypeMap from "../lib/typeMap.lib.js";
import Type1Row from "../classes/type1Row.class.js";
import Type2Row from "../classes/type2Row.class.js";
import Type3Row from "../classes/type3Row.class.js";
import Type4Row from "../classes/type4Row.class.js";
import Type5Row from "../classes/type5Row.class.js";
export default class BankSummaryReportUtil {

    static buildBankSummaryReport = (organizationID, monthYear, processorReports) => {
        try {

            // Build report data
            const reportData = buildBankSummaryReportData(processorReports);

            // Build report
            const bankReport = new Report(organizationID, '', 'bank summary', monthYear, reportData);
            // console.log('bankReport bankReport',bankReport);

            return bankReport;
        } catch (error) {
            console.error('Error creating bank  report:', error);
            throw new Error('Error creating bank  report: ' + error.message);
        }
    };
}

const buildBankSummaryReportData = (processorReports) => {
    try {

        // Ensure the inputs are valid
        if (!Array.isArray(processorReports)) {
            throw new Error('Invalid input:processorReports is not an array');
        }

        // Build the bank  report data by filtering each processor's report data
        const bankReportData = processorReports.map(report => ({
            processor: report.processor,
            reportData: buildProcessorReportData(report)
        }));


        return bankReportData;
    } catch (error) {
        console.error('Error building bank  report data:', error);
        throw new Error('Error building bank  report data: ' + error.message);
    }
};

const buildProcessorReportData = (report) => {
    try {
        console.log('Processing report for processor:', report.processor);
        //console.log('First row of report data structure:', report.reportData[0]); // Log the first row to inspect its structure
        // Ensure the report data and bank  clients are valid
        if (!report || !Array.isArray(report.reportData)) {
            throw new Error('Invalid report data: report or reportData is missing or not an array');
        }

        //console.log('clientMap:', clientMap);

        // Get processor type to handle different filtering logic
        const processorType = processorTypeMap[report.processor];
        
        // Filter report data based on processor type
        const filteredReportData = report.reportData.filter(row => {
            // For all processors, check if they have a Branch ID
            const hasBranch = row['Branch ID'] ? true : false;

            // Log whether the merchant ID was found or not
            if (!hasBranch) {
                return false; // Exclude rows without Branch ID
            } else {
                return true; // Include rows with Branch ID
            }
        });

        //console.log('Filtered report data:', filteredReportData); // Log filtered data

        const type = processorTypeMap[report.processor];

        return filteredReportData;
    } catch (error) {
        console.error('Error building processor report data:', error);
        throw new Error('Error building processor report data: ' + error.message);
    }
};
