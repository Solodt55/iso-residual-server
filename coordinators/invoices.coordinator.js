import InvoicesModel from '../models/invoices.model.js';

export default class InvoicesCoordinator {

    static getInvoiceNum = async (organizationID) => {
        try {
            const result = await InvoicesModel.getInvoiceNum(organizationID);
            // console.log('result: ', result);
            return result;
        } catch (error) {
            throw new Error('Error getting invoice number from DB: ' + error.message);
        };
    };

    static updateInvoiceNum = async (organizationID, newNumber) => {
        try {
            const result = await InvoicesModel.updateInvoiceNum(organizationID, newNumber);
            return result;
        } catch (error) {
            throw new Error('Error updating invoice number in DB: ' + error.message);
        };
    };
}