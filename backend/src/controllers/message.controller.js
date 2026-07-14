import User from "../models/user.model.js";
import Message from '../models/message.model.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mongoose from 'mongoose';


export const getUserForSidebar = asyncHandler(async (req, res) => {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select('-clerkId');
    return res.status(200).json(new ApiResponse(200, filteredUsers));
});

export const getConversationsForSidebar = asyncHandler(async (req, res) => {
    const loggedInUserId = req.user._id;

    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
            },
        },
        // 2. Collapse them into one row per chat partner, noting our latest message time.
        {
            $group: {
                // The partner is the other person on the message (not me).
                _id: {
                    $cond: [
                        { $eq: ["$senderId", loggedInUserId] },
                        "$receiverId",
                        "$senderId",
                    ],
                },
                lastMessageAt: { $max: "$createdAt" },
            },
        },
        { $sort: { lastMessageAt: -1 } },
        // 4. Look up each partner's user profile (comes back as an array).
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        // 5. Pull that profile out of the array and make it the document.
        { $replaceRoot: { newRoot: { $first: "$user" } } },
        // 6. Hide the private clerkId field from the result.
        { $project: { clerkId: 0 } },
    ]);

    return res.status(200).json(new ApiResponse(200, conversations));
});

export const getMessages = asyncHandler(async (req, res) => {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const messages = await Message.find({
        $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
        ]
    }).sort({ createdAt: 1 }).lean();
    return res.status(200).json(new ApiResponse(200, messages, 'messages fetched successfully'));
});

export const sendMessage = asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text?.trim() && !req.file) {
        throw new ApiError(400, "Message cannot be empty");
    }

    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
        throw new ApiError(400, "Invalid receiver id");
    }
    if (senderId.equals(receiverId)) {
        throw new ApiError(400, "Cannot send message to yourself");
    }

    let imageUrl;
    let videoUrl;
    if (req.file) {
        if (!hasImageKitConfig()) {
            throw new ApiError(500, 'Media upload is not configured');
        }
        const url = await uploadChatMedia(req.file);
        if (req.file.mimetype.startsWith("video/")) videoUrl = url;
        else imageUrl = url;
    }
    const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        video: videoUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.status(201).json(new ApiResponse(201, newMessage, "Message sent successfully"));
});





