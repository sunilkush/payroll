import { Router } from 'express';
import * as homeController from '../controllers/homeController.js';

const router = Router();

router.get('/', homeController.index);

export default router;
