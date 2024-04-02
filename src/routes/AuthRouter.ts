import * as express from "express";
import {completeGoogle, googleLogin, login, signup} from "../controllers/AuthCtrl";
import {AppDataSource, RedisClient} from "../app";
import {Guest} from "@spaceread/database/entity/user/Guest";
import {User} from "@spaceread/database/entity/user/User";
import {Review} from "@spaceread/database/entity/professor/Review";
import {CourseFile} from "@spaceread/database/entity/course/CourseFile";
import {Request, Response} from "express";

const AuthRouter = express.Router();

export interface RedisSession {
    username: string,
    csrfToken: string,
    expiration: number
}

AuthRouter.use(async (req, res, next) => {

    if (req.cookies.auth) {
        const profile = await RedisClient.get(req.cookies.auth);

        if (!profile) {
            res.clearCookie("auth");
            next();
        }

        const parsedProfile= JSON.parse(<string>profile) as RedisSession;

        if (parsedProfile.expiration < Date.now()) {
            res.clearCookie("auth");
            next();
        }

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
            message: "Bad request. Refresh the page and try again."
        });
        return;
    }

    res.locals.guest = guest;

    next();

});


async function moveGuestDataToUser(req: Request, res: Response) {
    res.status(200).send({
        success: true,
        redirect: "/"
    });

    const guest = res.locals.guest as Guest;
    const dbUser = res.locals.user as User;

    if (!guest || !dbUser) {
        return;
    }

    try {
        for (const reviews of guest.reviews) {
            reviews.user = dbUser;
            await AppDataSource.getRepository(Review).save(dbUser);
        }

        for (const courseFiles of guest.course_files) {
            courseFiles.user = dbUser;
            await AppDataSource.getRepository(CourseFile).save(dbUser);
        }
    } catch (e) {
        console.log(e);
        return;
    }
}


AuthRouter.post("/login", login, moveGuestDataToUser);
AuthRouter.post("/signup", signup, moveGuestDataToUser);

AuthRouter.post("/googleLogin", googleLogin, moveGuestDataToUser);
AuthRouter.post("/googleSignup", completeGoogle, moveGuestDataToUser);


export default AuthRouter;
