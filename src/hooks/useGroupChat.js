import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert, Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Uses native WebSocket (backend at /api/chat/ws)
import chatService from "../services/chatService";
import { API_BASE } from "../lib/axios";
import { STORAGE_KEYS } from "../constants/storage";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = API_BASE.replace(/\/api$/, "");

/**
 * useGroupChat — React Native equivalent of the frontend useGroupChat hook.
 *
 * @param {string|null}  groupId              – active group ID (null when none)
 * @param {Array}        allConversations     – full conversation list (used for forwarding)
 * @param {Function}     refreshConversations – reload the conversation list
 */
export function useGroupChat(
  groupId,
  allConversations = [],
  refreshConversations = () => {}
) {
  const { user } = useAuth();

  // ─── Socket ref ────────────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // ─── Core State ─────────────────────────────────────────────────────────────
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { uri, name, type }
  const [uploading, setUploading] = useState(false);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState([]);

  // Reactions
  const [reactionMsgId, setReactionMsgId] = useState(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  // Long-press / context
  const [longPressMsg, setLongPressMsg] = useState(null);

  // Reply
  const [replyTo, setReplyTo] = useState(null);

  // Search
  const [showMsgSearch, setShowMsgSearchRaw] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState([]);

  // Pinned messages
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  // Polls
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  // Mute
  const [isMuted, setIsMuted] = useState(false);

  // Invite link
  const [inviteCode, setInviteCode] = useState("");

  // Join requests
  const [joinRequests, setJoinRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);

  // Online members
  const [onlineMembers, setOnlineMembers] = useState([]);

  // Forward
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardConvos, setForwardConvos] = useState([]);

  // Media gallery
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);

  // Member roles
  const [roleEditMember, setRoleEditMember] = useState(null);
  const [roleInput, setRoleInput] = useState("");

  // Clear chat confirm
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Delete group confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit group
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Scroll
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgWhileAway, setNewMsgWhileAway] = useState(0);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const recordingRef = useRef(null); // expo-av Recording instance
  const recordingTimerRef = useRef(null);
  const soundRef = useRef(null); // expo-av Sound instance
  const isAtBottomRef = useRef(true);
  const prevMsgLengthRef = useRef(0);
  const msgSearchTimer = useRef(null);

  // ─── Socket Setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    let ws = null;
    let retryCount = 0;
    let pingInterval = null;
    let alive = true;

    const connectWs = async () => {
      if (!alive) return;
      const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
      if (!token) return;

      const wsUrl = SOCKET_URL.replace(/^http/, "ws") + `/api/chat/ws?token=${token}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setSocketConnected(true);
        retryCount = 0;
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (e) => {
        if (!alive) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "pong") return;
          if (socketRef.current?._handlers) {
            const handlers = socketRef.current._handlers[msg.type];
            if (handlers) handlers.forEach((h) => h(msg));
          }
        } catch {}
      };

      ws.onclose = () => {
        if (pingInterval) clearInterval(pingInterval);
        setSocketConnected(false);
        if (!alive) return;
        const delay = Math.min(1000 * 2 ** retryCount, 15000);
        retryCount++;
        setTimeout(connectWs, delay);
      };

      ws.onerror = () => { if (ws) ws.close(); };

      socketRef.current = ws;
      socketRef.current._handlers = socketRef.current._handlers || {};
    };

    connectWs();

    return () => {
      alive = false;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) { ws.close(); ws = null; }
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, []);

  // ─── Helpers / Formatters ─────────────────────────────────────────────────

  const formatDate = useCallback((dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatTime = useCallback((dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  const timeAgo = useCallback((dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, []);

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getGroup(groupId);
      setGroup(res);
    } catch {
      Alert.alert("Error", "Group not found");
      setGroup(null);
    }
  }, [groupId]);

  const loadMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getGroupMessages(groupId);
      const msgs = res.messages || res.data || res || [];
      const list = Array.isArray(msgs) ? msgs : [];
      // Enrich reply_preview / reply_sender from referenced messages
      const byId = {};
      for (const m of list) byId[m.id] = m;
      for (const m of list) {
        if (m.reply_to && !m.reply_preview && byId[m.reply_to]) {
          const ref = byId[m.reply_to];
          m.reply_preview =
            (ref.content || "").slice(0, 80) || (ref.media_url ? "Media" : "\u2026");
          m.reply_sender = ref.sender_name || "Unknown";
          if (ref.media_url) {
            m.reply_media_url = ref.media_url;
            m.reply_media_type = ref.media_type;
          }
        }
      }
      setMessages(list);
    } catch (err) {
      if (__DEV__) console.error("Failed to load group messages:", err);
    }
  }, [groupId]);

  // ─── Grouped Messages (date sections) ──────────────────────────────────────

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, msg) => {
      const date = formatDate(msg.created_at);
      if (!acc.length || acc[acc.length - 1].date !== date) {
        acc.push({ date, messages: [msg] });
      } else {
        acc[acc.length - 1].messages.push(msg);
      }
      return acc;
    }, []);
  }, [messages, formatDate]);

  // ─── Derived / Computed ────────────────────────────────────────────────────

  const isCreator = group?.created_by === user?.id;
  const isAdmin = group?.is_admin;
  const admins = group?.admins || [];
  const memberRoles = group?.member_roles || {};

  // ─── Effects ───────────────────────────────────────────────────────────────

  // 1. Load group + messages when groupId changes
  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setMessages([]);
      setLoading(false);
      setMsgText("");
      setSending(false);
      setPendingFile(null);
      setUploading(false);
      setTypingUsers([]);
      setReactionMsgId(null);
      setLongPressMsg(null);
      setReplyTo(null);
      setShowMsgSearchRaw(false);
      setMsgSearchQuery("");
      setMsgSearchResults([]);
      setShowPinned(false);
      setPinnedMessages([]);
      setShowPollCreate(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setIsMuted(false);
      setInviteCode("");
      setJoinRequests([]);
      setShowRequests(false);
      setIsRecording(false);
      setRecordingDuration(0);
      setOnlineMembers([]);
      setShowForwardModal(false);
      setForwardMsg(null);
      setShowMediaGallery(false);
      setMediaItems([]);
      setRoleEditMember(null);
      setRoleInput("");
      setShowClearConfirm(false);
      setShowDeleteConfirm(false);
      setDeleting(false);
      setShowEdit(false);
      setEditForm({});
      setShowScrollBtn(false);
      setNewMsgWhileAway(0);
      setPlayingAudio(null);
      setShowEmojiPicker(false);
      // Stop any playing audio
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      prevMsgLengthRef.current = 0;
      isAtBottomRef.current = true;
      return;
    }

    // Clear stale data from previous group
    setMessages([]);
    setGroup(null);
    setTypingUsers([]);
    setReplyTo(null);
    setLongPressMsg(null);
    setPendingFile(null);
    setMsgText("");
    setShowEmojiPicker(false);
    setShowMsgSearchRaw(false);
    setMsgSearchQuery("");
    setMsgSearchResults([]);
    setShowScrollBtn(false);
    setNewMsgWhileAway(0);
    setPlayingAudio(null);
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    prevMsgLengthRef.current = 0;
    isAtBottomRef.current = true;
    setLoading(true);
    Promise.all([loadGroup(), loadMessages()]).finally(() => setLoading(false));
  }, [groupId, loadGroup, loadMessages]);

  // 2. Socket event handlers
  useEffect(() => {
    const socket = socketRef.current;
    if (!groupId || !group?.is_member || !socket) return;

    const handleGroupMsg = (data) => {
      if (data.group_id === groupId) {
        setMessages((prev) => {
          const incoming = data.message || data;
          // Prevent duplicates
          if (incoming.id && prev.some((m) => m.id === incoming.id)) return prev;

          // Replace temp message from own send
          const isMine = incoming.sender_id === user?.id;
          if (isMine) {
            const tempIdx = prev.findIndex(
              (m) =>
                typeof m.id === "string" &&
                m.id.startsWith("temp-") &&
                m.sender_id === user?.id
            );
            if (tempIdx !== -1) {
              const temp = prev[tempIdx];
              const next = [...prev];
              next[tempIdx] = {
                ...incoming,
                reply_preview: incoming.reply_preview || temp.reply_preview,
                reply_sender: incoming.reply_sender || temp.reply_sender,
              };
              return next;
            }
          }

          // Enrich reply data from existing messages
          if (incoming.reply_to && !incoming.reply_preview) {
            const ref = prev.find((m) => m.id === incoming.reply_to);
            if (ref) {
              return [
                ...prev,
                {
                  ...incoming,
                  reply_preview:
                    (ref.content || "").slice(0, 80) ||
                    (ref.media_url ? "Media" : "\u2026"),
                  reply_sender: ref.sender_name || "Unknown",
                  reply_media_url: ref.media_url || undefined,
                  reply_media_type: ref.media_type || undefined,
                },
              ];
            }
          }

          return [...prev, incoming];
        });
        refreshConversations();
      }
    };

    const handleGroupReaction = (data) => {
      if (data.group_id === groupId) {
        loadMessages();
      }
    };

    const handleGroupMessageDeleted = (data) => {
      if (data.group_id === groupId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, deleted: true, content: "", media_url: "" }
              : m
          )
        );
      }
    };

    let groupTypingTimer = null;
    const handleGroupTyping = (data) => {
      if (data.group_id === groupId) {
        setTypingUsers(data.typing || (data.user_name ? [data.user_name] : []));
        if (groupTypingTimer) clearTimeout(groupTypingTimer);
        groupTypingTimer = setTimeout(() => {
          setTypingUsers([]);
        }, 3000);
      }
    };

    const handleGroupPollUpdate = (data) => {
      if (data.group_id === groupId) {
        loadMessages();
      }
    };

    socket.on("group_message", handleGroupMsg);
    socket.on("group_reaction", handleGroupReaction);
    socket.on("group_message_deleted", handleGroupMessageDeleted);
    socket.on("group_typing", handleGroupTyping);
    socket.on("group_poll_update", handleGroupPollUpdate);

    return () => {
      socket.off("group_message", handleGroupMsg);
      socket.off("group_reaction", handleGroupReaction);
      socket.off("group_message_deleted", handleGroupMessageDeleted);
      socket.off("group_typing", handleGroupTyping);
      socket.off("group_poll_update", handleGroupPollUpdate);
      if (groupTypingTimer) clearTimeout(groupTypingTimer);
    };
  }, [groupId, group?.is_member, user?.id, loadMessages, refreshConversations]);

  // 3. Polling fallback when socket is disconnected
  useEffect(() => {
    if (!groupId || !group?.is_member || socketConnected) return;
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [groupId, group?.is_member, socketConnected, loadMessages]);

  // 4. Online members polling every 15s
  useEffect(() => {
    if (!groupId || !group?.is_member) return;
    const load = () =>
      chatService
        .getOnline(groupId)
        .then((res) => setOnlineMembers(res.online || []))
        .catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [groupId, group?.is_member]);

  // 5. Mark read when messages change
  useEffect(() => {
    if (group?.is_member && messages.length > 0 && groupId) {
      chatService.markGroupRead(groupId).catch(() => {});
    }
  }, [messages.length, group?.is_member, groupId]);

  // 6. Check mute status on load
  useEffect(() => {
    if (group?.is_member && groupId) {
      chatService
        .toggleGroupMute(groupId)
        .then(() => {})
        .catch(() => {});
      // We just read mute status from group data if available
      setIsMuted(group?.muted || false);
    }
  }, [group?.is_member, groupId]);

  // 7. Track new messages for scroll FAB
  useEffect(() => {
    const newLen = messages.length;
    if (newLen > prevMsgLengthRef.current) {
      if (isAtBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd?.({ animated: true });
        }, 100);
        setNewMsgWhileAway(0);
      } else {
        setNewMsgWhileAway(
          (prev) => prev + (newLen - prevMsgLengthRef.current)
        );
      }
    }
    prevMsgLengthRef.current = newLen;
  }, [messages]);

  // 8. Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      chatService.heartbeat().catch(() => {});
    }, 30000);
    chatService.heartbeat().catch(() => {});
    return () => clearInterval(interval);
  }, []);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current);
    };
  }, []);

  // ─── Handler Functions ─────────────────────────────────────────────────────

  // ── Typing indicator ──
  const handleTyping = useCallback(() => {
    if (!groupId) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    const socket = socketRef.current;
    if (socket && socketConnected) {
      socket.emit("group_typing", { group_id: groupId });
    } else {
      chatService.sendGroupTyping(groupId).catch(() => {});
    }
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null;
    }, 3000);
  }, [groupId, socketConnected]);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    if ((!msgText.trim() && !pendingFile) || sending || !groupId) return;
    const text = msgText.trim();
    setMsgText("");
    setShowEmojiPicker(false);
    Keyboard.dismiss();
    setSending(true);
    const reply = replyTo;
    setReplyTo(null);
    const file = pendingFile;
    setPendingFile(null);

    // Upload file first if present
    let mediaUrlStr = "";
    let mediaType = "";
    let fileName = "";
    if (file) {
      setUploading(true);
      try {
        // Validate file before upload
        if (!file.uri) {
          throw new Error("File URI is missing");
        }
        
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name || "file",
          type: file.type || "application/octet-stream",
        });
        
        const uploadRes = await chatService.uploadFile(formData);
        
        // Validate response
        if (!uploadRes || !uploadRes.url) {
          throw new Error("Invalid upload response");
        }
        
        mediaUrlStr = uploadRes.url;
        mediaType = uploadRes.file_type;
        fileName = uploadRes.filename;
      } catch (error) {
        if (__DEV__) {
          console.error("[useGroupChat] File upload error:", {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
            file: {
              uri: file.uri,
              name: file.name,
              type: file.type,
            },
          });
        }
        
        const errorMsg = error.response?.data?.detail 
          || error.response?.data?.message 
          || error.message 
          || "Upload failed. Please try again.";
        
        Alert.alert("Upload Error", errorMsg);
        setSending(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Optimistic temp message
    const tempMsg = {
      id: "temp-" + Date.now(),
      group_id: groupId,
      sender_id: user?.id,
      sender_name: user?.name,
      content: text,
      media_url: mediaUrlStr,
      media_type: mediaType,
      file_name: fileName,
      reply_to: reply?.id,
      reply_preview:
        reply?.content?.slice(0, 80) ||
        (reply?.media_url ? "Media" : undefined),
      reply_sender: reply?.sender_name,
      reply_media_url: reply?.media_url || undefined,
      reply_media_type: reply?.media_type || undefined,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const payload = {
        content: text,
        ...(reply?.id && { reply_to: reply.id }),
        ...(mediaUrlStr && {
          media_url: mediaUrlStr,
          media_type: mediaType,
          file_name: fileName,
        }),
      };
      const res = await chatService.sendGroupMessage(groupId, payload);
      const serverMsg = res.message || res;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMsg.id
            ? {
                ...serverMsg,
                reply_preview: tempMsg.reply_preview,
                reply_sender: tempMsg.reply_sender,
                reply_media_url: tempMsg.reply_media_url,
                reply_media_type: tempMsg.reply_media_type,
              }
            : m
        )
      );
      refreshConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setMsgText(text);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [msgText, pendingFile, sending, groupId, replyTo, user, refreshConversations]);

  // ── Delete message ──
  const handleDeleteMessage = useCallback(
    async (msg) => {
      if (!groupId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, content: "", deleted: true, media_url: "" }
            : m
        )
      );
      setLongPressMsg(null);
      try {
        await chatService.deleteGroupMessage(groupId, msg.id);
      } catch {
        await loadMessages();
        Alert.alert("Error", "Failed to delete message");
      }
    },
    [groupId, loadMessages]
  );

  // ── Reactions ──
  const handleReaction = useCallback(
    async (msg, emoji) => {
      try {
        await chatService.reactGroupMessage(groupId, msg.id, emoji);
        await loadMessages();
      } catch {
        Alert.alert("Error", "Failed to react");
      }
      setReactionMsgId(null);
      setReactionPickerOpen(false);
    },
    [groupId, loadMessages]
  );

  // ─── File Picking ──────────────────────────────────────────────────────────

  const pickImage = useCallback(async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { requestPermission } = require("../../utils/permissions");
      await requestPermission(
        () => ImagePicker.requestMediaLibraryPermissionsAsync(),
        "Photo Library"
      );
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Validate asset
        if (!asset.uri) {
          Alert.alert("Error", "Invalid file selected");
          return;
        }
        
        // Check file size for videos (limit to 100MB)
        if (asset.type === "video" && asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
          Alert.alert("Error", "Video size must be less than 100MB");
          return;
        }
        
        const ext = asset.uri.split(".").pop() || "jpg";
        const fileName = asset.fileName || `${asset.type === "video" ? "video" : "image"}_${Date.now()}.${ext}`;
        const mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : `image/${ext}`);
        
        setPendingFile({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        });
      }
    } catch (err) {
      if (__DEV__) {
        console.error("pickImage error:", err);
        console.error("Error details:", {
          message: err.message,
          stack: err.stack,
        });
      }
      Alert.alert("Error", err.message || "Failed to select image");
    }
  }, []);

  const pickDocument = useCallback(async () => {
    try {
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Validate asset
        if (!asset.uri) {
          Alert.alert("Error", "Invalid file selected");
          return;
        }
        
        // Check file size (limit to 50MB)
        if (asset.size && asset.size > 50 * 1024 * 1024) {
          Alert.alert("Error", "File size must be less than 50MB");
          return;
        }
        
        setPendingFile({
          uri: asset.uri,
          name: asset.name || `file_${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch (err) {
      if (__DEV__) console.error("pickDocument error:", err);
      Alert.alert("Error", "Failed to select document");
    }
  }, []);

  const handleFileSelect = useCallback(() => {
    Alert.alert("Attach", "Choose an option", [
      { text: "Photo / Video", onPress: pickImage },
      { text: "Document", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickImage, pickDocument]);

  // ─── Voice Recording (expo-av) ─────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = require("expo-av");
      const { requestPermission } = require("../../utils/permissions");
      const granted = await requestPermission(
        () => Audio.requestPermissionsAsync(),
        "Microphone"
      );
      if (!granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingDuration((prev) => prev + 1),
        1000
      );
    } catch (err) {
      if (__DEV__) console.error("startRecording error:", err);
      Alert.alert("Error", "Could not start recording");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    const duration = recordingDuration;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return;

      const { Audio } = require("expo-av");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      setSending(true);
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `voice_${Date.now()}.m4a`,
        type: "audio/m4a",
      });
      
      const uploadRes = await chatService.uploadFile(formData);
      
      // Validate response
      if (!uploadRes || !uploadRes.url) {
        throw new Error("Invalid upload response");
      }
      
      await chatService.sendGroupMessage(groupId, {
        content: "",
        media_url: uploadRes.url,
        media_type: "voice",
        file_name: "Voice message",
        metadata: { duration },
      });
      await loadMessages();
      refreshConversations();
    } catch (error) {
      if (__DEV__) {
        console.error("[useGroupChat] Voice message upload error:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
      
      const errorMsg = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || "Failed to send voice message";
      
      Alert.alert("Upload Error", errorMsg);
    } finally {
      setSending(false);
    }
  }, [groupId, recordingDuration, loadMessages, refreshConversations]);

  const cancelRecording = useCallback(async () => {
    if (!isRecording) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    try {
      const { Audio } = require("expo-av");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
  }, [isRecording]);

  // ─── Audio Playback (expo-av) ──────────────────────────────────────────────

  const togglePlayAudio = useCallback(
    async (msgId, url) => {
      if (playingAudio === msgId) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync().catch(() => {});
        }
        setPlayingAudio(null);
        return;
      }
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      try {
        const { Audio } = require("expo-av");
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setPlayingAudio(null);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
        soundRef.current = sound;
        setPlayingAudio(msgId);
      } catch {
        Alert.alert("Error", "Could not play audio");
      }
    },
    [playingAudio]
  );

  // ─── Message Search ────────────────────────────────────────────────────────

  const handleMsgSearch = useCallback(
    (q) => {
      setMsgSearchQuery(q);
      if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current);
      if (q.length < 2) {
        setMsgSearchResults([]);
        return;
      }
      msgSearchTimer.current = setTimeout(async () => {
        try {
          const res = await chatService.searchGroupMessages(groupId, q);
          setMsgSearchResults(res.results || []);
        } catch {
          setMsgSearchResults([]);
        }
      }, 300);
    },
    [groupId]
  );

  const setShowMsgSearch = useCallback((v) => {
    setShowMsgSearchRaw(v);
    if (!v) {
      setMsgSearchQuery("");
      setMsgSearchResults([]);
    }
  }, []);

  const scrollToMessage = useCallback(
    (msgId) => {
      const index = messages.findIndex((m) => m.id === msgId);
      if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
      setShowMsgSearch(false);
    },
    [messages, setShowMsgSearch]
  );

  // ─── Pin Messages ─────────────────────────────────────────────────────────

  const handlePinMessage = useCallback(
    async (msg) => {
      try {
        await chatService.pinGroupMessage(groupId, msg.id);
        Alert.alert("Success", "Message pinned");
        setLongPressMsg(null);
        await loadMessages();
      } catch {
        Alert.alert("Error", "Failed to pin message");
      }
    },
    [groupId, loadMessages]
  );

  const handleUnpinMessage = useCallback(
    async (msg) => {
      try {
        await chatService.unpinGroupMessage(groupId, msg.id);
        Alert.alert("Success", "Message unpinned");
        setPinnedMessages((prev) => prev.filter((m) => m.id !== msg.id));
        await loadMessages();
      } catch {
        Alert.alert("Error", "Failed to unpin message");
      }
    },
    [groupId, loadMessages]
  );

  const handleTogglePin = useCallback(
    async (msg) => {
      if (msg.pinned) {
        await handleUnpinMessage(msg);
      } else {
        await handlePinMessage(msg);
      }
    },
    [handlePinMessage, handleUnpinMessage]
  );

  const loadPinnedMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getPinnedGroupMessages(groupId);
      const list = Array.isArray(res) ? res : res.data || [];
      setPinnedMessages(list);
      setShowPinned(true);
    } catch {
      Alert.alert("Error", "Failed to load pinned messages");
    }
  }, [groupId]);

  // ─── Polls ─────────────────────────────────────────────────────────────────

  const handleCreatePoll = useCallback(async () => {
    const validOpts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOpts.length < 2) {
      Alert.alert("Error", "Need a question and at least 2 options");
      return;
    }
    try {
      await chatService.createGroupPoll(groupId, {
        question: pollQuestion.trim(),
        options: validOpts,
      });
      setShowPollCreate(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      await loadMessages();
      refreshConversations();
    } catch {
      Alert.alert("Error", "Failed to create poll");
    }
  }, [groupId, pollQuestion, pollOptions, loadMessages, refreshConversations]);

  const handleVotePoll = useCallback(
    async (msg, optionIndex) => {
      try {
        await chatService.voteGroupPoll(groupId, msg.id, optionIndex);
        await loadMessages();
      } catch {
        Alert.alert("Error", "Failed to vote");
      }
    },
    [groupId, loadMessages]
  );

  // ─── Media Gallery ─────────────────────────────────────────────────────────

  const loadMediaGallery = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getGroupMedia(groupId);
      const items = Array.isArray(res) ? res : res.media || res.data || [];
      setMediaItems(items);
      setShowMediaGallery(true);
    } catch {
      Alert.alert("Error", "Failed to load media");
    }
  }, [groupId]);

  // ─── Mute ──────────────────────────────────────────────────────────────────

  const handleToggleMute = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.toggleGroupMute(groupId);
      const muted = res.muted ?? !isMuted;
      setIsMuted(muted);
      Alert.alert("Success", muted ? "Group muted" : "Group unmuted");
    } catch {
      Alert.alert("Error", "Failed to toggle mute");
    }
  }, [groupId, isMuted]);

  // ─── Forward ───────────────────────────────────────────────────────────────

  const openForwardModal = useCallback(
    (msg) => {
      setForwardMsg(msg);
      setLongPressMsg(null);
      setForwardConvos(allConversations.filter((c) => c.id !== groupId));
      setShowForwardModal(true);
    },
    [allConversations, groupId]
  );

  const handleForwardToConvo = useCallback(
    async (targetConvo) => {
      if (!forwardMsg) return;
      try {
        await chatService.forwardMessage({
          source_type: "group",
          source_id: groupId,
          message_id: forwardMsg.id,
          target_type: targetConvo.group_id ? "group" : "dm",
          target_id: targetConvo.id,
        });
        Alert.alert("Success", "Message forwarded");
        setShowForwardModal(false);
        setForwardMsg(null);
      } catch {
        Alert.alert("Error", "Failed to forward message");
      }
    },
    [forwardMsg, groupId]
  );

  // ─── Clear Chat ────────────────────────────────────────────────────────────

  const handleClearChat = useCallback(async () => {
    if (!groupId) return;
    try {
      await chatService.clearGroupChat(groupId);
      setMessages([]);
      setShowClearConfirm(false);
      Alert.alert("Success", "Chat cleared for you");
    } catch {
      Alert.alert("Error", "Failed to clear chat");
    }
  }, [groupId]);

  // ─── Invite Link ───────────────────────────────────────────────────────────

  const handleGetInvite = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getInviteLink(groupId);
      setInviteCode(res.invite_code || res.code || "");
    } catch {
      Alert.alert("Error", "Failed to generate invite link");
    }
  }, [groupId]);

  // ─── Join Requests ─────────────────────────────────────────────────────────

  const loadJoinRequests = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await chatService.getJoinRequests(groupId);
      const list = Array.isArray(res) ? res : res.data || [];
      setJoinRequests(list);
      setShowRequests(true);
    } catch {
      Alert.alert("Error", "Failed to load join requests");
    }
  }, [groupId]);

  const handleApproveRequest = useCallback(
    async (reqId) => {
      try {
        await chatService.approveJoinRequest(groupId, reqId);
        setJoinRequests((prev) => prev.filter((r) => r.id !== reqId));
        loadGroup();
        Alert.alert("Success", "Request approved");
      } catch {
        Alert.alert("Error", "Failed to approve");
      }
    },
    [groupId, loadGroup]
  );

  const handleRejectRequest = useCallback(
    async (reqId) => {
      try {
        await chatService.rejectJoinRequest(groupId, reqId);
        setJoinRequests((prev) => prev.filter((r) => r.id !== reqId));
      } catch {
        Alert.alert("Error", "Failed to reject");
      }
    },
    [groupId]
  );

  // ─── Member Management ────────────────────────────────────────────────────

  const handleJoin = useCallback(async () => {
    if (!groupId) return;
    try {
      await chatService.joinGroup(groupId);
      Alert.alert("Success", "Joined group!");
      loadGroup();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to join");
    }
  }, [groupId, loadGroup]);

  const handleLeave = useCallback(async () => {
    if (!groupId) return;
    try {
      await chatService.leaveGroup(groupId);
      Alert.alert("Success", "Left group");
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to leave");
    }
  }, [groupId]);

  const handlePromote = useCallback(
    async (memberId) => {
      try {
        await chatService.promote(groupId, memberId);
        Alert.alert("Success", "Member promoted");
        loadGroup();
      } catch (err) {
        Alert.alert("Error", err?.response?.data?.detail || "Failed to promote");
      }
    },
    [groupId, loadGroup]
  );

  const handleDemote = useCallback(
    async (memberId) => {
      try {
        await chatService.demote(groupId, memberId);
        Alert.alert("Success", "Member demoted");
        loadGroup();
      } catch (err) {
        Alert.alert("Error", err?.response?.data?.detail || "Failed to demote");
      }
    },
    [groupId, loadGroup]
  );

  const handleRemoveMember = useCallback(
    async (memberId) => {
      try {
        await chatService.removeMember(groupId, memberId);
        Alert.alert("Success", "Member removed");
        loadGroup();
      } catch (err) {
        Alert.alert("Error", err?.response?.data?.detail || "Failed to remove");
      }
    },
    [groupId, loadGroup]
  );

  const handleSetRole = useCallback(
    async (memberId, role) => {
      try {
        await chatService.setMemberRole(groupId, memberId, role);
        setRoleEditMember(null);
        setRoleInput("");
        loadGroup();
        Alert.alert("Success", role ? `Role set: ${role}` : "Role removed");
      } catch {
        Alert.alert("Error", "Failed to set role");
      }
    },
    [groupId, loadGroup]
  );

  // ─── Delete Group ──────────────────────────────────────────────────────────

  const handleDeleteGroup = useCallback(async () => {
    if (!groupId) return;
    setDeleting(true);
    try {
      await chatService.deleteGroup(groupId);
      Alert.alert("Success", "Group deleted");
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to delete group");
    } finally {
      setDeleting(false);
    }
  }, [groupId]);

  // ─── Edit Group ────────────────────────────────────────────────────────────

  const openEdit = useCallback(() => {
    if (!group) return;
    setEditForm({
      name: group.name || "",
      description: group.description || "",
      sport: group.sport || "",
      is_private: group.is_private || false,
      max_members: group.max_members || 500,
      avatar_url: group.avatar_url || "",
      cover_url: group.cover_url || "",
    });
    setShowEdit(true);
  }, [group]);

  const handleSaveEdit = useCallback(async () => {
    if (!editForm.name?.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setSavingEdit(true);
    try {
      await chatService.updateGroup(groupId, editForm);
      Alert.alert("Success", "Group updated");
      setShowEdit(false);
      loadGroup();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || "Failed to update");
    } finally {
      setSavingEdit(false);
    }
  }, [groupId, editForm, loadGroup]);

  const handleAvatarUpload = useCallback(async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { requestPermission } = require("../../utils/permissions");
      await requestPermission(
        () => ImagePicker.requestMediaLibraryPermissionsAsync(),
        "Photo Library"
      );
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Validate asset
        if (!asset.uri) {
          Alert.alert("Error", "Invalid image selected");
          return;
        }
        
        const ext = asset.uri.split(".").pop() || "jpg";
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `avatar_${Date.now()}.${ext}`,
          type: asset.mimeType || `image/${ext}`,
        });
        
        const uploadRes = await chatService.uploadFile(formData);
        
        // Validate response
        if (!uploadRes || !uploadRes.url) {
          throw new Error("Invalid upload response");
        }
        
        const url = uploadRes.url;
        setEditForm((p) => ({ ...p, avatar_url: url }));
        await chatService.updateGroup(groupId, { avatar_url: url });
        setGroup((prev) => (prev ? { ...prev, avatar_url: url } : prev));
        Alert.alert("Success", "Group photo updated");
      }
    } catch (error) {
      if (__DEV__) {
        console.error("[useGroupChat] Avatar upload error:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
      
      const errorMsg = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || "Upload failed";
      
      Alert.alert("Upload Error", errorMsg);
    }
  }, [groupId]);

  const handleCoverUpload = useCallback(async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { requestPermission } = require("../../utils/permissions");
      await requestPermission(
        () => ImagePicker.requestMediaLibraryPermissionsAsync(),
        "Photo Library"
      );
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        
        // Validate asset
        if (!asset.uri) {
          Alert.alert("Error", "Invalid image selected");
          return;
        }
        
        const ext = asset.uri.split(".").pop() || "jpg";
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: asset.fileName || `cover_${Date.now()}.${ext}`,
          type: asset.mimeType || `image/${ext}`,
        });
        
        const uploadRes = await chatService.uploadFile(formData);
        
        // Validate response
        if (!uploadRes || !uploadRes.url) {
          throw new Error("Invalid upload response");
        }
        
        setEditForm((p) => ({ ...p, cover_url: uploadRes.url }));
      }
    } catch (error) {
      if (__DEV__) {
        console.error("[useGroupChat] Cover upload error:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
      
      const errorMsg = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || "Upload failed";
      
      Alert.alert("Upload Error", errorMsg);
    }
  }, []);

  // ─── Scroll Helpers ────────────────────────────────────────────────────────

  const handleScrollEvent = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    const atBottom = contentOffset.y < 50; // inverted list: 0 = bottom
    isAtBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
    if (atBottom) setNewMsgWhileAway(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    setNewMsgWhileAway(0);
  }, []);

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Core
    group,
    loading,
    messages,
    groupedMessages,
    socketConnected,

    // Message input
    msgText,
    setMsgText,
    handleSend,
    sending,
    uploading,
    pendingFile,
    setPendingFile,
    handleFileSelect,
    pickImage,
    pickDocument,

    // Refs
    flatListRef,
    inputRef,

    // Reply
    replyTo,
    setReplyTo,

    // Long-press / context
    longPressMsg,
    setLongPressMsg,

    // Typing
    handleTyping,
    typingUsers,

    // Reactions
    reactionMsgId,
    setReactionMsgId,
    handleReaction,
    reactionPickerOpen,
    setReactionPickerOpen,

    // Message actions
    handleDeleteMessage,
    handleTogglePin,
    handlePinMessage,
    handleUnpinMessage,

    // Search
    showMsgSearch,
    setShowMsgSearch,
    msgSearchQuery,
    msgSearchResults,
    handleMsgSearch,
    scrollToMessage,

    // Pinned
    showPinned,
    setShowPinned,
    pinnedMessages,
    loadPinnedMessages,

    // Polls
    showPollCreate,
    setShowPollCreate,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    handleCreatePoll,
    handleVotePoll,

    // Mute
    isMuted,
    handleToggleMute,

    // Invite
    inviteCode,
    handleGetInvite,

    // Join requests
    showRequests,
    setShowRequests,
    joinRequests,
    loadJoinRequests,
    handleApproveRequest,
    handleRejectRequest,

    // Voice recording
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,

    // Audio playback
    playingAudio,
    togglePlayAudio,

    // Online
    onlineMembers,

    // Forward
    showForwardModal,
    setShowForwardModal,
    forwardMsg,
    forwardConvos,
    openForwardModal,
    handleForwardToConvo,

    // Gallery
    showMediaGallery,
    setShowMediaGallery,
    mediaItems,
    loadMediaGallery,

    // Edit group
    showEdit,
    setShowEdit,
    editForm,
    setEditForm,
    openEdit,
    handleAvatarUpload,
    handleCoverUpload,
    handleSaveEdit,
    savingEdit,

    // Member management
    roleEditMember,
    setRoleEditMember,
    roleInput,
    setRoleInput,
    handleSetRole,
    handleJoin,
    handleLeave,
    handlePromote,
    handleDemote,
    handleRemoveMember,

    // Delete group
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteGroup,
    deleting,

    // Clear chat
    showClearConfirm,
    setShowClearConfirm,
    handleClearChat,

    // Scroll
    showScrollBtn,
    newMsgWhileAway,
    handleScrollEvent,
    scrollToBottom,

    // Lightbox
    lightboxImage,
    setLightboxImage,

    // Emoji picker
    showEmojiPicker,
    setShowEmojiPicker,

    // Derived
    isCreator,
    isAdmin,
    admins,
    memberRoles,

    // Formatters
    formatTime,
    formatDate,
    timeAgo,

    // Re-export for manual refresh
    loadMessages,
    loadGroup,
  };
}
