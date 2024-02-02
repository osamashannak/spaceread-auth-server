import * as express from "express";
import {login, signup} from "../controllers/AuthCtrl";
import {AppDataSource} from "../app";
import {Guest} from "@spaceread/database/entity/user/Guest";
import {User} from "@spaceread/database/entity/user/User";
import {Review} from "@spaceread/database/entity/professor/Review";
import {CourseFile} from "@spaceread/database/entity/course/CourseFile";
import {Request, Response} from "express";

const AuthRouter = express.Router();

AuthRouter.use(async (req, res, next) => {

    if (req.cookies.auth) {

        // todo check if the cookie is valid

        res.status(200).send({
            success: true,
            redirect: "/"
        });

        return;
    }

    const guestId = req.cookies.gid;

    let guest = await AppDataSource.getRepository(Guest).findOne({
        where: {token: guestId}
    });

    if (!guest) {
        res.status(400).send({
            success: false,
            message: "Invalid username or email or password."
        });
        return;
    }

    res.locals.guest = guest;

    console.log("before")

    next();

});


async function moveGuestDataToUser(req: Request, res: Response) {
    res.status(200).send({
        success: true,
        redirect: "/"
    });

    const guest = res.locals.guest as Guest;
    const dbUser = res.locals.user as User;

    for (const reviews of guest.reviews) {
        reviews.user = dbUser;
        await AppDataSource.getRepository(Review).save(dbUser);
    }

    for (const courseFiles of guest.courseFiles) {
        courseFiles.user = dbUser;
        await AppDataSource.getRepository(CourseFile).save(dbUser);
    }
}


AuthRouter.post("/login", login, moveGuestDataToUser);
AuthRouter.post("/signup", signup, moveGuestDataToUser);


export default AuthRouter;
