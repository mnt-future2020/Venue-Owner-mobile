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
 * useDmChat — React Native equivalent of the frontend useDmChat hook.
 *
 * @param {object|null} activeConvo          – the currently-selected DM conversation
 * @param {Array}       allConversations     – full conversation list (used for forwarding)
 * @param {Function}    refreshConversations – reload the conversation list
 * @param {Function}    [updateActiveItem]   – optional callback to update active item fields
 */
export function useDmChat(
  activeConvo,
  allConversations = [],
  refreshConversations = () => {},
  updateActiveItem
) {
  const { user } = useAuth();

  // ─── Socket ref ────────────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // ─── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  const [onlineStatus, setOnlineStatus] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [longPressMsg, setLongPressMsg] = useState(null);

  const [pendingFile, setPendingFile] = useState(null); // { uri, name, type }
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);

  const [showMsgSearch, setShowMsgSearchRaw] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState([]);
  const [hoverReaction, setHoverReaction] = useState(null);

  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardConvos, setForwardConvos] = useState([]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgWhileAway, setNewMsgWhileAway] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

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
          // Dispatch to registered handlers via socketRef
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

      // Store ws + handler registry on socketRef
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

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadMessages = useCallback(async (convoId) => {
    if (!convoId) return;
    try {
      const res = await chatService.getMessages(convoId);
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
      if (__DEV__) console.error("Failed to load messages:", err);
    }
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────

  // 1. Load messages + reset state when activeConvo changes
  useEffect(() => {
    if (activeConvo?.id) {
      loadMessages(activeConvo.id);
    } else {
      setMessages([]);
    }
    // Clear stale state
    setOnlineStatus(null);
    setIsTyping(false);
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
  }, [activeConvo?.id, loadMessages]);

  // 2. Socket event handlers
  useEffect(() => {
    const socket = socketRef.current;
    if (!activeConvo || !socket) return;

    const handleNewMsg = (data) => {
      if (data.conversation_id === activeConvo.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          const isMine = data.message.sender_id === user?.id;
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
                ...data.message,
                reply_preview: data.message.reply_preview || temp.reply_preview,
                reply_sender: data.message.reply_sender || temp.reply_sender,
              };
              return next;
            }
          }
          // Enrich reply data from existing messages if missing
          const incoming = data.message;
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
      }
      refreshConversations();
    };

    const handleTypingWs = (data) => {
      if (data.conversation_id === activeConvo.id) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleOnline = (data) => {
      if (activeConvo?.other_user?.id === data.user_id) {
        setOnlineStatus((prev) => ({ ...prev, online: data.online }));
      }
    };

    const handleDeleted = (data) => {
      if (data.conversation_id === activeConvo.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, content: "", deleted: true } : m
          )
        );
      }
    };

    const handleRead = (data) => {
      if (data.conversation_id === activeConvo.id) {
        setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      }
    };

    const handleReactionWs = (data) => {
      if (data.conversation_id === activeConvo.id) {
        loadMessages(activeConvo.id);
      }
    };

    const handleRequestAccepted = (data) => {
      if (data.conversation_id === activeConvo.id && updateActiveItem) {
        updateActiveItem({ status: "active" });
      }
      Alert.alert("Request Accepted", `${data.accepted_by} accepted your message request`);
      refreshConversations();
    };

    socket.on("new_message", handleNewMsg);
    socket.on("typing", handleTypingWs);
    socket.on("online_status", handleOnline);
    socket.on("message_deleted", handleDeleted);
    socket.on("messages_read", handleRead);
    socket.on("message_reaction", handleReactionWs);
    socket.on("request_accepted", handleRequestAccepted);

    return () => {
      socket.off("new_message", handleNewMsg);
      socket.off("typing", handleTypingWs);
      socket.off("online_status", handleOnline);
      socket.off("message_deleted", handleDeleted);
      socket.off("messages_read", handleRead);
      socket.off("message_reaction", handleReactionWs);
      socket.off("request_accepted", handleRequestAccepted);
    };
  }, [activeConvo, user?.id, refreshConversations, loadMessages, updateActiveItem]);

  // 3. Polling fallbacks when socket is disconnected

  // Poll messages
  useEffect(() => {
    if (!activeConvo || socketConnected) return;
    const interval = setInterval(() => loadMessages(activeConvo.id), 3000);
    return () => clearInterval(interval);
  }, [activeConvo, loadMessages, socketConnected]);

  // Online status polling
  useEffect(() => {
    if (!activeConvo?.other_user?.id) {
      setOnlineStatus(null);
      return;
    }
    if (socketConnected) return;
    const check = () =>
      chatService
        .onlineStatus(activeConvo.other_user.id)
        .then((data) => setOnlineStatus(data))
        .catch(() => {});
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [activeConvo, socketConnected]);

  // Typing status polling
  useEffect(() => {
    if (!activeConvo?.id || socketConnected) return;
    const check = () =>
      chatService
        .sendTyping(activeConvo.id)
        .catch(() => {});
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [activeConvo, socketConnected]);

  // Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      chatService.heartbeat().catch(() => {});
    }, 30000);
    // Initial heartbeat
    chatService.heartbeat().catch(() => {});
    return () => clearInterval(interval);
  }, []);

  // 4. Track new messages for scroll FAB
  useEffect(() => {
    const newLen = messages.length;
    if (newLen > prevMsgLengthRef.current) {
      if (isAtBottomRef.current) {
        // Auto-scroll the FlatList to bottom
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

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current);
    };
  }, []);

  // ─── Grouped Messages ─────────────────────────────────────────────────────

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

  const lastSeenText = useCallback(() => {
    if (!onlineStatus) return "";
    if (onlineStatus.online) return "online";
    if (!onlineStatus.last_seen) return "";
    return `last seen ${timeAgo(onlineStatus.last_seen)}`;
  }, [onlineStatus, timeAgo]);

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

  // ─── Handler Functions ─────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if ((!msgText.trim() && !pendingFile) || sending || !activeConvo) return;
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
          console.error("[useDmChat] File upload error:", {
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

    const tempMsg = {
      id: "temp-" + Date.now(),
      conversation_id: activeConvo.id,
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
      read: false,
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
      const res = await chatService.sendMessage(activeConvo.id, payload);
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
  }, [msgText, pendingFile, sending, activeConvo, replyTo, user, refreshConversations]);

  const handleTyping = useCallback(() => {
    if (!activeConvo?.id) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    const socket = socketRef.current;
    if (socket && socketConnected) {
      socket.emit("typing", { conversation_id: activeConvo.id });
    } else {
      chatService.sendTyping(activeConvo.id).catch(() => {});
    }
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null;
    }, 3000);
  }, [activeConvo?.id, socketConnected]);

  const handleDeleteMessage = useCallback(
    async (msg) => {
      if (!activeConvo) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, content: "", deleted: true } : m
        )
      );
      setLongPressMsg(null);
      try {
        await chatService.deleteMessage(activeConvo.id, msg.id);
      } catch {
        await loadMessages(activeConvo.id);
        Alert.alert("Error", "Failed to delete message");
      }
    },
    [activeConvo, loadMessages]
  );

  // Reactions
  const handleReaction = useCallback(
    async (msg, emoji) => {
      try {
        await chatService.reactToMessage(activeConvo.id, msg.id, emoji);
        await loadMessages(activeConvo.id);
      } catch {
        Alert.alert("Error", "Failed to react");
      }
      setHoverReaction(null);
    },
    [activeConvo, loadMessages]
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
      await chatService.sendMessage(activeConvo.id, {
        content: "",
        media_url: uploadRes.url,
        media_type: "voice",
        file_name: "Voice message",
        metadata: { duration },
      });
      await loadMessages(activeConvo.id);
      refreshConversations();
    } catch {
      Alert.alert("Error", "Failed to send voice message");
    } finally {
      setSending(false);
    }
  }, [activeConvo, recordingDuration, loadMessages, refreshConversations]);

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
          const res = await chatService.searchMessages(activeConvo.id, q);
          setMsgSearchResults(res.results || []);
        } catch {
          setMsgSearchResults([]);
        }
      }, 300);
    },
    [activeConvo]
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
        await chatService.pinMessage(activeConvo.id, msg.id);
        Alert.alert("Success", "Message pinned");
        setLongPressMsg(null);
        await loadMessages(activeConvo.id);
      } catch {
        Alert.alert("Error", "Failed to pin message");
      }
    },
    [activeConvo, loadMessages]
  );

  const handleUnpinMessage = useCallback(
    async (msg) => {
      try {
        await chatService.unpinMessage(activeConvo.id, msg.id);
        Alert.alert("Success", "Message unpinned");
        setPinnedMessages((prev) => prev.filter((m) => m.id !== msg.id));
        await loadMessages(activeConvo.id);
      } catch {
        Alert.alert("Error", "Failed to unpin message");
      }
    },
    [activeConvo, loadMessages]
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
    if (!activeConvo) return;
    try {
      const res = await chatService.getPinnedMessages(activeConvo.id);
      const list = Array.isArray(res) ? res : res.data || [];
      setPinnedMessages(list);
      setShowPinned(true);
    } catch {
      Alert.alert("Error", "Failed to load pinned messages");
    }
  }, [activeConvo]);

  // ─── Polls ─────────────────────────────────────────────────────────────────

  const handleCreatePoll = useCallback(async () => {
    const validOpts = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOpts.length < 2) {
      Alert.alert("Error", "Need a question and at least 2 options");
      return;
    }
    try {
      await chatService.createPoll(activeConvo.id, pollQuestion.trim(), validOpts);
      setShowPollCreate(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      await loadMessages(activeConvo.id);
      refreshConversations();
    } catch {
      Alert.alert("Error", "Failed to create poll");
    }
  }, [activeConvo, pollQuestion, pollOptions, loadMessages, refreshConversations]);

  const handleVotePoll = useCallback(
    async (msg, optionIndex) => {
      try {
        await chatService.votePoll(activeConvo.id, msg.id, optionIndex);
        await loadMessages(activeConvo.id);
      } catch {
        Alert.alert("Error", "Failed to vote");
      }
    },
    [activeConvo, loadMessages]
  );

  // ─── Media Gallery ─────────────────────────────────────────────────────────

  const loadMediaGallery = useCallback(async () => {
    if (!activeConvo) return;
    try {
      const res = await chatService.getMedia(activeConvo.id);
      const items = Array.isArray(res) ? res : res.media || res.data || [];
      setMediaItems(items);
      setShowMediaGallery(true);
    } catch {
      Alert.alert("Error", "Failed to load media");
    }
  }, [activeConvo]);

  // ─── Mute ──────────────────────────────────────────────────────────────────

  const handleToggleMute = useCallback(async () => {
    if (!activeConvo) return;
    try {
      const res = await chatService.muteConversation(activeConvo.id);
      const muted = res.muted ?? !isMuted;
      setIsMuted(muted);
      Alert.alert("Success", muted ? "Conversation muted" : "Conversation unmuted");
    } catch {
      Alert.alert("Error", "Failed to toggle mute");
    }
  }, [activeConvo, isMuted]);

  // ─── Forward ───────────────────────────────────────────────────────────────

  const openForwardModal = useCallback(
    (msg) => {
      setForwardMsg(msg);
      setLongPressMsg(null);
      setForwardConvos(allConversations.filter((c) => c.id !== activeConvo?.id));
      setShowForwardModal(true);
    },
    [allConversations, activeConvo]
  );

  const handleForwardToConvo = useCallback(
    async (targetConvo) => {
      if (!forwardMsg) return;
      try {
        await chatService.forwardMessage({
          source_type: "dm",
          source_id: activeConvo.id,
          message_id: forwardMsg.id,
          target_type: "dm",
          target_id: targetConvo.id,
        });
        Alert.alert("Success", `Forwarded to ${targetConvo.other_user?.name}`);
        setShowForwardModal(false);
        setForwardMsg(null);
      } catch {
        Alert.alert("Error", "Failed to forward message");
      }
    },
    [forwardMsg, activeConvo]
  );

  // ─── Clear Chat ────────────────────────────────────────────────────────────

  const handleClearChat = useCallback(async () => {
    if (!activeConvo) return;
    try {
      await chatService.clearChat(activeConvo.id);
      setMessages([]);
      setShowClearConfirm(false);
      Alert.alert("Success", "Chat cleared for you");
    } catch {
      Alert.alert("Error", "Failed to clear chat");
    }
  }, [activeConvo]);

  // ─── Scroll Helpers ────────────────────────────────────────────────────────

  const handleScrollEvent = useCallback((event) => {
    // For inverted FlatList: at top = at bottom of conversation
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
    // State
    messages,
    groupedMessages,
    msgText,
    setMsgText,
    sending,
    uploading,
    onlineStatus,
    isTyping,
    lastSeenText,
    replyTo,
    setReplyTo,
    longPressMsg,
    setLongPressMsg,
    pendingFile,
    setPendingFile,
    hoverReaction,
    setHoverReaction,
    showMsgSearch,
    setShowMsgSearch,
    msgSearchQuery,
    msgSearchResults,
    showPinned,
    setShowPinned,
    pinnedMessages,
    showPollCreate,
    setShowPollCreate,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    showMediaGallery,
    setShowMediaGallery,
    mediaItems,
    isMuted,
    showForwardModal,
    setShowForwardModal,
    forwardMsg,
    forwardConvos,
    showClearConfirm,
    setShowClearConfirm,
    showScrollBtn,
    newMsgWhileAway,
    lightboxImage,
    setLightboxImage,
    showEmojiPicker,
    setShowEmojiPicker,
    reactionPickerOpen,
    setReactionPickerOpen,
    isRecording,
    recordingDuration,
    socketConnected,

    // Refs
    flatListRef,
    inputRef,

    // Handlers
    handleSend,
    handleTyping,
    handleDeleteMessage,
    handleReaction,
    handleFileSelect,
    pickImage,
    pickDocument,
    startRecording,
    stopRecording,
    cancelRecording,
    togglePlayAudio,
    handleMsgSearch,
    scrollToMessage,
    handlePinMessage,
    handleUnpinMessage,
    handleTogglePin,
    loadPinnedMessages,
    handleCreatePoll,
    handleVotePoll,
    loadMediaGallery,
    handleToggleMute,
    openForwardModal,
    handleForwardToConvo,
    handleClearChat,
    handleScrollEvent,
    scrollToBottom,
    loadMessages,

    // Formatters
    formatTime,
    formatDate,
    timeAgo,
  };
}
