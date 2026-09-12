import { google } from "googleapis";
import { NextApiRequest, NextApiResponse } from "next";
import { checkLimit } from "../../../lib/ratelimiter";

const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
}).fromJSON({
    type: "service_account",
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
});

const EXPEDITED_ID = process.env.EXPEDITED_ID;
const ROLLING_ID = process.env.ROLLING_ID;

const sheets = google.sheets("v4");

const apply = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const ip =
            ((req.headers["x-forwarded-for"] as string) || "").split(" ")[0] ??
            req.headers["x-real-ip"];

        const body = JSON.parse(req.body);

        if (await checkLimit(ip)) {
            return res.status(429).json({ res: "You are being rate limited." });
        }

        const verifyRes = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `secret=${process.env.CAPTCHA_SECRET}&response=${body["captcha"]}`,
            }
        );

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return res.status(403).json({
                res: "Failed captcha verification",
            });
        }

        const request = {
            spreadsheetId:
                body["row"][0][0] === "Expedited_App"
                    ? EXPEDITED_ID
                    : ROLLING_ID,
            range: "Sheet1!A1:M1",
            valueInputOption: "USER_ENTERED",
            insertDataOption: "OVERWRITE",
            resource: {
                values: body["row"],
            },
            auth: auth,
        };
        const response = (await sheets.spreadsheets.values.append(request))
            .data;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(response);
        res.status(200).json({ res: "Application successful!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({
            res: "Application unsuccessful, please try again.",
        });
    }
};

export default apply;
