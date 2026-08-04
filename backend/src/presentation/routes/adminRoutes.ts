import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();
const controller = new AdminController();

router.use(adminMiddleware);

router.get('/stats', (req, res) => controller.getStats(req, res));
router.get('/subscriptions', (req, res) => controller.getSubscriptionDashboard(req, res));
router.get('/business-metrics', (req, res) => controller.getBusinessMetrics(req, res));
router.get('/users', (req, res) => controller.listUsers(req, res));
router.get('/stores', (req, res) => controller.listStores(req, res));
router.get('/users/:id', (req, res) => controller.getUser(req, res));
router.get('/logs', (req, res) => controller.getLogs(req, res));
router.get('/request-logs', (req, res) => controller.getRequestLogs(req, res));
router.get('/security', (req, res) => controller.getSecurityOverview(req, res));
router.post('/users/:id/premium', (req, res) => controller.setPremium(req, res));
router.patch('/users/:id/signup-platform', (req, res) => controller.setSignupPlatform(req, res));
router.post('/users/:id/grant-trial', (req, res) => controller.grantTrial(req, res));
router.post('/users/:id/impersonate', (req, res) => controller.impersonateUser(req, res));
router.get('/users/:id/data', (req, res) => controller.getUserData(req, res));
router.put('/users/:id/ingredients/:ingredientId', (req, res) => controller.updateUserIngredient(req, res));
router.put('/users/:id/recipes/:recipeId', (req, res) => controller.updateUserRecipe(req, res));
router.post('/users/:id/reset-password', (req, res) => controller.resetUserPassword(req, res));
router.post('/users/:id/toggle-active', (req, res) => controller.toggleUserActive(req, res));
router.get('/users/:id/premium-history', (req, res) => controller.getPremiumHistory(req, res));
router.patch('/premium-events/:id', (req, res) => controller.updatePremiumEventAmount(req, res));
router.post('/send-update-email', (req, res) => controller.sendUpdateEmail(req, res));
router.get('/settings/daily-registration-goal', (req, res) => controller.getDailyRegistrationGoal(req, res));
router.put('/settings/daily-registration-goal', (req, res) => controller.setDailyRegistrationGoal(req, res));

router.post('/db/query', (req, res) => controller.executeQuery(req, res));

export default router;
