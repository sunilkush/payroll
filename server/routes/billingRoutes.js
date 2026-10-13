import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema, upgradeRequestSchema, verifyPaymentSchema } from '../validators/billingValidator.js';
import { idParamSchema } from '../validators/common.js';

const router = Router();

router.get('/', billingController.get);
router.post('/upgrade-request', validate(upgradeRequestSchema), billingController.requestUpgrade);
router.delete('/upgrade-request', billingController.cancelRequest);

// Online payment: order banao -> (browser mein Razorpay Checkout) -> payment ki jaanch. Phir plan chalu aur invoice.
router.post('/checkout', validate(checkoutSchema), billingController.checkout);
router.post('/verify', validate(verifyPaymentSchema), billingController.verifyPayment);
router.get('/invoices', billingController.invoices);
router.get('/invoices/:id/pdf', validate(idParamSchema, 'params'), billingController.invoicePdf);

export default router;
