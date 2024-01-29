import * as express from "express";
import {login, signup} from "../controllers/AuthCtrl";

const AuthRouter = express.Router();

AuthRouter.post("/login", login);
AuthRouter.post("/signup", signup);

export default AuthRouter;
