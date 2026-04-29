import { Router } from "express";
import { login, signupCompany } from "../controllers/auth.controller.js";
const router = Router();
router.post("/signup-company", signupCompany);
router.post("/login", login);
export default router;
