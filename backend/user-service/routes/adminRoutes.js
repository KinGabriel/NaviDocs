import express from "express";
import { createUser, getUsers} from "../controllers/adminController.js";
import { authenticateJWT } from "../middleware/authenticationMiddleware.js"; 

const router = express.Router();

router.post("/crete-user", createUser);
router.get("/get-users", authenticateJWT, getUsers);

export default router;