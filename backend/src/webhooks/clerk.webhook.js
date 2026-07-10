import express from 'express';
import User from "../models/user.model.js";
import { verifyWebhook } from "@clerk/backend/webhooks";
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {

    // console.log("🔥 Clerk webhook received");
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;;
    if (!signingSecret) {
        throw new ApiError(503, "Webhook secret is not provided");
    }

    // clerk's verifier expects a Web Request with the raw body; express.raw gives a Buffer.
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
    const request = new Request("http://internal/webhooks/clerk", {
        method: "POST",
        headers: new Headers(req.headers),
        body: payload,
    });

    // throws if the signature is wrong or the body was tampered with; only then do we trust evt.
    const evt = await verifyWebhook(request, { signingSecret });
    // console.log("Verified:", evt.type);


    if (evt.type === "user.created" || evt.type === "user.updated") {
        const u = evt.data;

        const email =
            u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
                ?.email_address ?? u.email_addresses?.[0]?.email_address;

        const fullName =
            [u.first_name, u.last_name].filter(Boolean).join(" ") ||
            u.username ||
            email?.split("@")[0];

        const user = await User.findOneAndUpdate(
            { clerkId: u.id },
            { clerkId: u.id, email, fullName, profilePic: u.image_url },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );
        // console.log(user.lean());
    }

    if (evt.type === "user.deleted") {
        if (evt.data.id) await User.findOneAndDelete({ clerkId: evt.data.id });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { received: true }, "Webhook received"));
    
}));

export default router;