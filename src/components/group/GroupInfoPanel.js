import React, { useCallback, useEffect, useState } from "react";
import { useWishlist } from "../../context/WishlistContext";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Crown,
  Eraser,
  Globe,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MoreVertical,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  UserMinus,
  Users,
  X,
} from "lucide-react-native";

import chatService from "../../services/chatService";
import { mediaUrl } from "../../utils/media";
import toast from "../../utils/toast";
import { PRIMARY_COLOR } from "../../constants/theme";
import { safePush } from "../../services/navigationGuard";
import { useAuth } from "../../context/AuthContext";
import InviteLinkModal from "./InviteLinkModal";
import JoinRequestsModal from "./JoinRequestsModal";
import GroupInfoSkeleton from "../skeletons/GroupInfoSkeleton";
import ChatMediaGridSkeleton from "../skeletons/ChatMediaGridSkeleton";

const ROLE_PRESETS = [
  "Captain",
  "Vice Captain",
  "Coach",
  "Goalkeeper",
  "Striker",
  "Manager",
  "Organizer",
];

export default function GroupInfoPanel({ groupId }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshUnreadCount, notifyChatRead } = useWishlist();
  const userId = String(user?.id || user?._id || "");

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roleEditMember, setRoleEditMember] = useState(null);
  const [roleInput, setRoleInput] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // ── Load group data ───────────────────────────────────────
  const loadGroup = useCallback(async () => {
    try {
      setError(null);
      const data = await chatService.getGroup(groupId);
      setGroup(data);
    } catch (err) {
      setError("Failed to load group info");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Load online members
  useEffect(() => {
    if (!groupId) return;
    chatService
      .getOnlineMembers(groupId)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.members || data?.online || [];
        setOnlineMembers(list.map((m) => (typeof m === "string" ? m : m.id || m._id)));
      })
      .catch(() => {});
  }, [groupId]);

  // ── Derived data ──────────────────────────────────────────
  const members = group?.member_details || group?.members || [];
  const admins = group?.admins || [];
  const memberRoles = group?.member_roles || {};
  const isAdmin = admins.includes(userId) || String(group?.created_by) === userId;
  const isCreator = String(group?.created_by) === userId;
  const onlineCount = onlineMembers.length;

  const sortedMembers = [...members].sort((a, b) => {
    const aId = String(a.id || a._id);
    const bId = String(b.id || b._id);
    const aAdmin = admins.includes(aId) ? -1 : 0;
    const bAdmin = admins.includes(bId) ? -1 : 0;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    const aOnline = onlineMembers.includes(aId) ? -1 : 0;
    const bOnline = onlineMembers.includes(bId) ? -1 : 0;
    return aOnline - bOnline;
  });

  const filteredMembers = memberSearch
    ? sortedMembers.filter((m) =>
        m.name?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : sortedMembers;

  // ── Actions ───────────────────────────────────────────────
  const handleToggleMute = async () => {
    try {
      await chatService.toggleGroupMute(groupId);
      setIsMuted((p) => !p);
      toast.success(isMuted ? "Unmuted" : "Muted");
    } catch {
      toast.error("Failed to update mute");
    }
  };

  const handleClearChat = () => {
    Alert.alert("Clear Chat", "This will clear all messages for you.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.clearGroupChat(groupId);
            toast.success("Chat cleared");
          } catch {
            toast.error("Failed to clear chat");
          }
        },
      },
    ]);
  };

  const handlePromote = (memberId) => {
    Alert.alert("Promote", "Promote this member to admin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Promote",
        onPress: async () => {
          try {
            await chatService.promoteMember(groupId, memberId);
            toast.success("Member promoted");
            loadGroup();
          } catch {
            toast.error("Failed to promote");
          }
        },
      },
    ]);
  };

  const handleDemote = (memberId) => {
    Alert.alert("Demote", "Remove admin role from this member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Demote",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.demoteMember(groupId, memberId);
            toast.success("Member demoted");
            loadGroup();
          } catch {
            toast.error("Failed to demote");
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (memberId) => {
    Alert.alert("Remove Member", "Remove this member from the group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.removeMember(groupId, memberId);
            toast.success("Member removed");
            loadGroup();
          } catch {
            toast.error("Failed to remove member");
          }
        },
      },
    ]);
  };

  const handleSetRole = async (memberId, role) => {
    try {
      await chatService.setMemberRole(groupId, memberId, role);
      toast.success(role ? `Role set to ${role}` : "Role removed");
      setRoleEditMember(null);
      loadGroup();
    } catch {
      toast.error("Failed to set role");
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.leaveGroup(groupId);
            toast.success("Left group");
            refreshUnreadCount?.();
            notifyChatRead();
            router.dismissAll();
            router.replace("/(tabs)/chat");
          } catch {
            toast.error("Failed to leave group");
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await chatService.deleteGroup(groupId);
      toast.success("Group deleted");
      refreshUnreadCount?.();
      notifyChatRead();
      router.dismissAll();
      router.replace("/(tabs)/chat");
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeleting(false);
    }
  };

  const handleMemberLongPress = (member) => {
    const memberId = String(member.id || member._id);
    const isMe = memberId === userId;
    const isMemberCreator = memberId === String(group?.created_by);
    if (!isAdmin || isMe || isMemberCreator) return;

    const isMemberAdmin = admins.includes(memberId);
    const customRole = memberRoles[memberId];

    const options = [
      {
        text: "Set Role",
        onPress: () => {
          setRoleEditMember(memberId);
          setRoleInput(customRole || "");
        },
      },
    ];

    if (!isMemberAdmin) {
      options.push({
        text: "Promote to Admin",
        onPress: () => handlePromote(memberId),
      });
    } else if (isCreator) {
      options.push({
        text: "Demote from Admin",
        onPress: () => handleDemote(memberId),
      });
    }

    options.push({
      text: "Remove from Group",
      style: "destructive",
      onPress: () => handleRemoveMember(memberId),
    });

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(member.name || "Member", null, options);
  };

  // ── Loading / Error states ────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Info</Text>
          <View style={{ width: 40 }} />
        </View>
        <GroupInfoSkeleton />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Info</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || "Group not found"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadGroup}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group.name || "Group Info"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        {group.cover_url && (
          <View style={styles.coverWrap}>
            <Image
              source={{ uri: mediaUrl(group.cover_url) }}
              style={styles.coverImage}
              contentFit="cover"
            />
          </View>
        )}

        {/* Group name */}
        <Text style={styles.groupName}>{group.name}</Text>

        {/* ── About Section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <Text style={styles.descriptionText}>
            {group.description || "No description yet."}
          </Text>

          {/* Tags */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              {group.is_private ? (
                <Lock size={10} color={PRIMARY_COLOR} />
              ) : (
                <Globe size={10} color={PRIMARY_COLOR} />
              )}
              <Text style={styles.tagText}>
                {group.group_type || (group.is_private ? "Private" : "Public")}
              </Text>
            </View>
            {group.sport && (
              <View style={styles.tagSecondary}>
                <Text style={styles.tagSecondaryText}>{group.sport}</Text>
              </View>
            )}
            <Text style={styles.maxMembersText}>
              Max {group.max_members || 500}
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleMute}>
            {isMuted ? (
              <Bell size={16} color="#6B7280" />
            ) : (
              <BellOff size={16} color="#6B7280" />
            )}
            <Text style={styles.actionBtnText}>
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleClearChat}>
            <Eraser size={16} color="#6B7280" />
            <Text style={styles.actionBtnText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={async () => {
              setShowMediaModal(true);
              setMediaLoading(true);
              try {
                const data = await chatService.getGroupMedia(groupId);
                setMediaItems(Array.isArray(data) ? data : data?.media || []);
              } catch {
                setMediaItems([]);
              } finally {
                setMediaLoading(false);
              }
            }}
          >
            <ImageIcon size={16} color="#6B7280" />
            <Text style={styles.actionBtnText}>Media</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowInviteModal(true)}
            >
              <Link2 size={16} color="#6B7280" />
              <Text style={styles.actionBtnText}>Invite</Text>
            </TouchableOpacity>
          )}

          {isAdmin && group.is_private && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowJoinRequests(true)}
            >
              <Users size={16} color="#6B7280" />
              <Text style={styles.actionBtnText}>Requests</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Members Section ── */}
        <View style={styles.section}>
          <View style={styles.memberHeaderRow}>
            <Text style={styles.sectionLabel}>MEMBERS</Text>
            <View style={styles.memberCounts}>
              {onlineCount > 0 && (
                <View style={styles.onlineCountRow}>
                  <View style={styles.onlineDotSmall} />
                  <Text style={styles.onlineCountText}>
                    {onlineCount} online
                  </Text>
                </View>
              )}
              <Text style={styles.totalCountText}>
                {group.member_count || members.length} total
              </Text>
            </View>
          </View>

          {/* Search members */}
          {members.length > 6 && (
            <View style={styles.memberSearchWrap}>
              <Search size={14} color="#9CA3AF" />
              <TextInput
                value={memberSearch}
                onChangeText={setMemberSearch}
                placeholder="Search members..."
                placeholderTextColor="#9CA3AF"
                style={styles.memberSearchInput}
              />
              {memberSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMemberSearch("")}>
                  <X size={14} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Members list */}
          {filteredMembers.length === 0 && memberSearch ? (
            <View style={styles.emptyMembers}>
              <Text style={styles.emptyMembersText}>No members found</Text>
            </View>
          ) : (
            filteredMembers.map((m) => {
              const mId = String(m.id || m._id);
              const isMemberAdmin = admins.includes(mId);
              const isMemberCreator = mId === String(group.created_by);
              const isMe = mId === userId;
              const isOnline = onlineMembers.includes(mId);
              const customRole = memberRoles[mId];
              const isEditingRole = roleEditMember === mId;

              return (
                <View key={mId}>
                  <TouchableOpacity
                    style={styles.memberRow}
                    activeOpacity={0.7}
                    onLongPress={() => handleMemberLongPress(m)}
                    delayLongPress={400}
                    onPress={() =>
                      safePush(router, `/(stack)/player/${mId}`)
                    }
                  >
                    {/* Avatar */}
                    <View style={styles.memberAvatarWrap}>
                      {m.avatar ? (
                        <Image
                          source={{ uri: mediaUrl(m.avatar) }}
                          style={styles.memberAvatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.memberAvatarFallback}>
                          <User size={16} color={PRIMARY_COLOR} />
                        </View>
                      )}
                      {isOnline && <View style={styles.memberOnlineDot} />}
                    </View>

                    {/* Info */}
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text
                          style={styles.memberName}
                          numberOfLines={1}
                        >
                          {m.name}
                          {isMe && (
                            <Text style={styles.memberYouLabel}> (you)</Text>
                          )}
                        </Text>
                        {isMemberCreator && (
                          <Crown size={14} color="#F59E0B" />
                        )}
                        {isMemberAdmin && !isMemberCreator && (
                          <ShieldCheck size={14} color={PRIMARY_COLOR} />
                        )}
                      </View>
                      <View style={styles.memberSubRow}>
                        {customRole && (
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>
                              {customRole}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.memberSR}>
                          {m.skill_rating || 1500} SR
                        </Text>
                      </View>
                    </View>

                    {/* Admin action button — visible for admins on other members */}
                    {isAdmin && !isMe && !isMemberCreator ? (
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => handleMemberLongPress(m)}
                        hitSlop={8}
                      >
                        <MoreVertical size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>

                  {/* Inline Role Editor */}
                  {isEditingRole && (
                    <View style={styles.roleEditor}>
                      <View style={styles.roleEditorHeader}>
                        <Text style={styles.roleEditorTitle}>
                          Set Role for {m.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setRoleEditMember(null)}
                        >
                          <X size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.rolePresetsRow}>
                        {ROLE_PRESETS.map((r) => (
                          <TouchableOpacity
                            key={r}
                            style={[
                              styles.rolePresetBtn,
                              roleInput === r && styles.rolePresetBtnActive,
                            ]}
                            onPress={() => setRoleInput(r)}
                          >
                            <Text
                              style={[
                                styles.rolePresetText,
                                roleInput === r &&
                                  styles.rolePresetTextActive,
                              ]}
                            >
                              {r}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TextInput
                        value={roleInput}
                        onChangeText={setRoleInput}
                        placeholder="Or type a custom role..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.roleCustomInput}
                      />

                      <View style={styles.roleActionRow}>
                        <TouchableOpacity
                          style={styles.roleCancelBtn}
                          onPress={() => setRoleEditMember(null)}
                        >
                          <Text style={styles.roleCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.roleSetBtn}
                          onPress={() => handleSetRole(mId, roleInput)}
                        >
                          <Check size={12} color="#FFFFFF" />
                          <Text style={styles.roleSetText}>Set Role</Text>
                        </TouchableOpacity>
                        {memberRoles[mId] && (
                          <TouchableOpacity
                            style={styles.roleRemoveBtn}
                            onPress={() => handleSetRole(mId, "")}
                          >
                            <Text style={styles.roleRemoveText}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── Danger Zone ── */}
        <View style={styles.dangerZone}>
          {!isCreator && (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleLeave}>
              <LogOut size={18} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Leave Group</Text>
            </TouchableOpacity>
          )}

          {isCreator && !showDeleteConfirm && (
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Delete Group</Text>
            </TouchableOpacity>
          )}

          {isCreator && showDeleteConfirm && (
            <View style={styles.deleteConfirm}>
              <Text style={styles.deleteConfirmText}>
                Delete permanently? All messages will be lost.
              </Text>
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={styles.deleteConfirmCancel}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Trash2 size={14} color="#FFFFFF" />
                      <Text style={styles.deleteConfirmBtnText}>
                        Confirm Delete
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Invite Link Modal */}
      <InviteLinkModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        groupId={groupId}
      />

      {/* Join Requests Modal */}
      <JoinRequestsModal
        visible={showJoinRequests}
        onClose={() => setShowJoinRequests(false)}
        groupId={groupId}
      />

      {/* Shared Media Modal */}
      <Modal
        visible={showMediaModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={styles.mediaOverlay}>
          <View style={styles.mediaContainer}>
            <View style={styles.mediaHeader}>
              <Text style={styles.mediaTitle}>Shared Media</Text>
              <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            {mediaLoading ? (
              <ChatMediaGridSkeleton />
            ) : mediaItems.length === 0 ? (
              <View style={styles.mediaEmpty}>
                <ImageIcon size={32} color="#CBD5E1" />
                <Text style={styles.mediaEmptyText}>No shared media</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.mediaGrid}>
                {mediaItems.map((item, idx) => {
                  const uri = item.media_url || item.url || item.uri || "";
                  if (!uri) return null;
                  return (
                    <TouchableOpacity key={item.id || item._id || idx} activeOpacity={0.8}>
                      <Image
                        source={{ uri: mediaUrl(uri) }}
                        style={styles.mediaThumb}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Cover
  coverWrap: {
    borderRadius: 16,
    overflow: "hidden",
    height: 160,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },

  // Group name
  groupName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  // Section
  section: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagSecondary: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagSecondaryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "capitalize",
  },
  maxMembersText: {
    fontSize: 10,
    color: "#94A3B8",
    marginLeft: "auto",
  },

  // Quick Actions
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  // Members
  memberHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberCounts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  onlineCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  onlineCountText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
  totalCountText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  memberSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    height: 34,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
  },
  emptyMembers: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyMembersText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  memberAvatarWrap: {
    position: "relative",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  memberAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  memberOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  memberYouLabel: {
    fontSize: 10,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  memberSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleBadge: {
    backgroundColor: "rgba(5,150,105,0.08)",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: PRIMARY_COLOR,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberSR: {
    fontSize: 11,
    color: "#94A3B8",
  },

  // Role Editor
  roleEditor: {
    marginLeft: 50,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  roleEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleEditorTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  rolePresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  rolePresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  rolePresetBtnActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  rolePresetText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  rolePresetTextActive: {
    color: "#FFFFFF",
  },
  roleCustomInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  roleCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleCancelText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  roleSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  roleSetText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  roleRemoveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  roleRemoveText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#EF4444",
  },

  // Danger Zone
  dangerZone: {
    gap: 10,
    paddingBottom: 10,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  deleteConfirm: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    backgroundColor: "rgba(239,68,68,0.04)",
    padding: 16,
    gap: 12,
  },
  deleteConfirmText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteConfirmCancel: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmCancelText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Shared Media Modal
  mediaOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  mediaContainer: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderCurve: "continuous", maxHeight: "70%" },
  mediaHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  mediaTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  mediaEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  mediaEmptyText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 4 },
  mediaThumb: { width: 108, height: 108, borderRadius: 10, borderCurve: "continuous", backgroundColor: "#E5E7EB" },
});
