// if using mongodb
import { db } from '../lib/database.lib.js';
import Constants from '../lib/constants.lib.js';

export default class InvoicesModel {

    static getInvoiceNum = async (organizationID) => {
        try {
            // console.log('organizationID: ' + organizationID);
             const result = await db.dbInvoices().findOne({organizationID});
            //  console.log('result: ', result);
             if (!result) {
                    const newInvoice = await db.dbInvoices().insertOne({
                        organizationID,
                        number: 1
                    });
                    // console.log('newInvoice: ' + newInvoice);
                    if (newInvoice.insertedId) {
                        return 1;
                    };
                };
                // console.log('result.number: ', result.number);
                return result;
        } catch (error) {
            console.error('Error getting invoice number from DB: ' + error.message);
            new Error('Error getting invoice number from DB: ' + error.message);
        };
    };

    static updateInvoiceNum = async (organizationID, newNumber) => {
        try {
            const result = db.dbInvoices().updateOne({organizationID}, {$set: {number: newNumber}});
            return result;
        } catch (error) {
            console.error('Error updating invoice number in DB: ' + error.message);
            new Error('Error updating invoice number in DB: ' + error.message);
        };
    };
};