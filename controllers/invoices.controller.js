import InvoicesCoordinator from '../coordinators/invoices.coordinator.js';

export default class InvoicesController {
    static getInvoiceNum = async (req, res, next) => {
        try {
            const organizationID = req.params.organizationID;
            // console.log('organizationID: ' + organizationID);
            const result = await InvoicesCoordinator.getInvoiceNum(organizationID);
            // console.log('result: ', result);
            if (result) {
                res.status(200).json(result);
            } else {
                res.status(204).json({error: 'Invoice number not found'});
            }
        } catch (error) {
            res.status(500).json({error: error.message});
            next(error);
        };
    };

    static updateInvoiceNum = async (req, res, next) => {
        try {
            const organizationID = req.params.organizationID;
            const newNumber = req.body.invoiceNum;
            // log invoice number
            // console.log('newNumber: ' + newNumber);
            const result = await InvoicesCoordinator.updateInvoiceNum(organizationID, newNumber);
            if (result) {
                res.status(200).json({message: 'Invoice number updated'});
            } else {
                res.status(404).json({error: 'Invoice number not updated'});
            }
        } catch (error) {
            res.status(500).json({error: error.message});
            next(error);
        };
    };
};