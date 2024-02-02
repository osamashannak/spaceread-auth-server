import env from "dotenv";
env.config();

import express from 'express';
import AuthRouter from "./routes/AuthRouter";
import {createClient} from 'redis';
import bodyParser from "body-parser";
import {createDataSource} from "@spaceread/database";
import cookies from "cookie-parser";

const App = express();

export const RedisClient = createClient();
export const AppDataSource = createDataSource({
    host: process.env.POSTGRES_HOST,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: false,
});

App.use(bodyParser.json({
    limit: '1mb'
}));
App.use(cookies());

App.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173'); // todo change this
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'private, no-cache, s-maxage=0, max-age=0, must-revalidate, no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.removeHeader("X-Powered-By");
    next();
});

App.use("/gate", AuthRouter);

(async function initialize() {
    console.log("Initializing App Data Source...")
    await AppDataSource.initialize();

    console.log("Initializing Redis Client...")
    await RedisClient.connect();

    App.listen(3030);
    console.log('Client Gate is running on port 3030');
})()
