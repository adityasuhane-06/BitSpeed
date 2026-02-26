import { Router } from "express";
import { identify } from "../controllers/contact.controller";

const router = Router();

/**
 * POST /identify
 * Receives email and/or phoneNumber, returns consolidated contact identity.
 */
router.post("/identify", identify);

export default router;
