import DashboardCoordinator from '../coordinators/dashboard.coordinator.js';

export default class DashboardController {
    static async getNeedsApproval(req, res) {
        try {
            // const needsApproval = await DashboardCoordinator.getNeedsApproval(req.params.organizationID);
            // res.status(200).json(needsApproval);
            res.status(200).json([]);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}