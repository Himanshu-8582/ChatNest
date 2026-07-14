import { create } from "zustand";
import { persist } from 'zustand/middleware';

import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "../stores/useAuthStore.js";
import toast from 'react-hot-toast';

export const useChatStore = create(
    persist((set, get) => ({
        users: [],
        conversations: [],
        messages: [],
        selectedUser: null,
        isConversationsLoading: false,
        isUserLoading: false,
        isMessagesLoading: false,
        activeConversationId: null,
        searchQuery: "",
        sidebarTab: "chats",
        composerText: "",
        isSoundEnabled: true,
        isSendingMedia: false,

        getUsers: async () => {
            set({ isUserLoading: true });
            try {
                const res = await axiosInstance.get("/messages/users");
                set((state) => ({
                    users: res.data.data,
                    selectedUser:
                        state.selectedUser &&
                            res.data.data.some((user) => user._id === state.selectedUser._id)
                            ? state.selectedUser
                            : null,
                }));
            } catch (err) {
                console.log("Error in get users", err.message);
            } finally {
                set({ isUserLoading: false });
            }
        },

        getConversations: async () => {
            set({ isConversationsLoading: true });
            try {
                const res = await axiosInstance.get("/messages/conversations");
                set({ conversations: res.data.data });
            } catch (err) {
                console.log("Error in getConversations: ", err.message);
            } finally {
                set({ isConversationsLoading: false });
            }
        },

        getMessages: async (userId) => {
            if (!userId) return;
            set({ isMessagesLoading: true });
            try {
                const res = await axiosInstance.get(`/messages/${userId}`);
                set({ messages: res.data.data });
            } catch (error) {
                toast.error(error.response?.data?.message || "failed to load messages");
            } finally {
                set({ isMessagesLoading: false });
            }
        },

        sendMessage: async (messagedata) => {
            const { selectedUser, messages } = get();
            if (!selectedUser) return false;
            try {
                const res = await axiosInstance.post(
                    `/messages/send/${selectedUser._id}`,
                    messagedata,
                );
                set({ messages: [...messages, res.data.data], composerText: "" });
                get().getConversations();
                return true;
            } catch (error) {
                toast.error(error.response?.data?.message || "failed to send messages");
                return false;
            }
        },

        subscribeToMessages: (userId) => {
            if (!userId) return;
            const socket = useAuthStore.getState().socket;
            if (!socket) return;
            socket.off("newMessage");
            socket.on("newMessage", (newMessage) => {
                if (String(newMessage.senderId) !== String(userId)) return;
                set({ messages: [...get().messages, newMessage] });
                get().getConversations();
            });
        },

        unsubscribeFromMessages: () => {
            const socket = useAuthStore.getState().socket;
            socket?.off("newMessage");
        },

        setSelectedUser: (selectedUser) => set({ selectedUser }),

        setActiveConversationId: (activeConversationId) => {
            set((state) => ({
                activeConversationId,
                selectedUser:
                    state.users.find((user) => user._id === activeConversationId) ||
                    state.conversations.find(
                        (user) => user._id === activeConversationId,
                    ) ||
                    null,
                messages: activeConversationId ? state.messages : [],
            }));
        },

        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setSidebarTab: (sidebarTab) => set({ sidebarTab }),
        setComposerText: (composerText) => set({ composerText }),
        setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),

        sendTextMessage: async (conversationId) => {
            const messageText = get().composerText.trim();
            if (!conversationId || !messageText) return false;

            return get().sendMessage({ text: messageText });
        },

        sendMediaMessage: async ({ conversationId, file }) => {
            if (!conversationId || !file) return false;

            const formData = new FormData();
            formData.append("media", file);

            set({ isSendingMedia: true });
            try {
                return await get().sendMessage(formData);
            } finally {
                set({ isSendingMedia: false });
            }
        },
    }),
        {
            name: "chatNest-storage",
            partialize: (state) => ({ isSoundEnabled: state.isSoundEnabled }),
        }
    ),
);
