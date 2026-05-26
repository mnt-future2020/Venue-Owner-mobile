import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Camera, ImagePlus, LogOut, Save, Trash2, User, X } from "lucide-react-native";
import uploadService from "../../services/uploadService";
import { useAuth } from "../../context/AuthContext";
import { mediaUrl } from "../../utils/media";
import { PRIMARY_COLOR } from "../../constants/theme";
import toast from "../../utils/toast";
import authService from "../../services/authService";
import coachingService from "../../services/coachingService";
import { useWishlist } from "../../context/WishlistContext";
import LogoutModal from "../ui/LogoutModal";
import ActionSheetModal from "../ui/ActionSheetModal";
import ImageCropModal from "./ImageCropModal";

export default function EditProfileSheet({ visible, onClose, card, onSaved }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const { notifyChatRead } = useWishlist();
  const scrollRef = useRef(null);
  const fieldPositionsRef = useRef({});
  const bioInputRef = useRef(null);
  const sportsInputRef = useRef(null);
  const preferredPositionInputRef = useRef(null);
  const coachingBioInputRef = useRef(null);
  const coachingSportsInputRef = useRef(null);
  const sessionPriceInputRef = useRef(null);
  const sessionDurationInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const coachingVenueInputRef = useRef(null);
  const businessNameInputRef = useRef(null);
  const gstNumberInputRef = useRef(null);
  const [name, setName] = useState(card?.name || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(card?.phone || user?.phone || "");
  const [bio, setBio] = useState(card?.bio || "");
  const [sports, setSports] = useState((card?.sports || user?.sports || []).join(", "));
  const [preferredPosition, setPreferredPosition] = useState(
    card?.preferred_position || user?.preferred_position || ""
  );
  const [avatarUri, setAvatarUri] = useState(card?.avatar || user?.avatar || "");
  const [newAvatarAsset, setNewAvatarAsset] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [cropSource, setCropSource] = useState(null); // { uri, width, height }
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState(null);

  const [coachingBio, setCoachingBio] = useState(user?.coaching_bio || "");
  const [coachingSports, setCoachingSports] = useState((user?.coaching_sports || []).join(", "));
  const [sessionPrice, setSessionPrice] = useState(user?.session_price ? String(user.session_price) : "");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(
    user?.session_duration_minutes ? String(user.session_duration_minutes) : "60"
  );
  const [city, setCity] = useState(user?.city || "");
  const [coachingVenue, setCoachingVenue] = useState(user?.coaching_venue || "");

  const [businessName, setBusinessName] = useState(user?.business_name || "");
  const [gstNumber, setGstNumber] = useState(user?.gst_number || "");

  useEffect(() => {
    if (!visible) return;
    const role = user?.role;

    setName(card?.name || user?.name || "");
    setEmail(user?.email || "");
    setPhone(card?.phone || user?.phone || "");
    setAvatarUri(card?.avatar || user?.avatar || "");
    setNewAvatarAsset(null);
    setAvatarRemoved(false);
    setCropSource(null);
    setEditing(false);
    setActiveFieldKey(null);

    if (role === "player") {
      setBio(card?.bio || user?.bio || "");
      setSports((card?.sports || user?.sports || []).join(", "));
      setPreferredPosition(card?.preferred_position || user?.preferred_position || "");
      setCoachingBio("");
      setCoachingSports("");
      setSessionPrice("");
      setSessionDurationMinutes("60");
      setCity("");
      setCoachingVenue("");
      setBusinessName("");
      setGstNumber("");
      return;
    }

    if (role === "venue_owner") {
      setBio(card?.bio || user?.bio || "");
      setBusinessName(card?.business_name || user?.business_name || "");
      setGstNumber(card?.gst_number || user?.gst_number || "");
      setSports("");
      setPreferredPosition("");
      setCoachingBio("");
      setCoachingSports("");
      setSessionPrice("");
      setSessionDurationMinutes("60");
      setCity("");
      setCoachingVenue("");
      return;
    }

    if (role === "coach") {
      setBio("");
      setSports("");
      setPreferredPosition("");
      setCoachingBio(card?.coaching_bio || user?.coaching_bio || "");
      setCoachingSports((card?.coaching_sports || user?.coaching_sports || []).join(", "));
      setSessionPrice(
        card?.session_price != null
          ? String(card.session_price)
          : user?.session_price != null
            ? String(user.session_price)
            : ""
      );
      setSessionDurationMinutes(
        card?.session_duration_minutes != null
          ? String(card.session_duration_minutes)
          : user?.session_duration_minutes != null
            ? String(user.session_duration_minutes)
            : "60"
      );
      setCity(card?.city || user?.city || "");
      setCoachingVenue(card?.coaching_venue || user?.coaching_venue || "");
      setBusinessName("");
      setGstNumber("");
      return;
    }

    setBio(card?.bio || user?.bio || "");
    setSports("");
    setPreferredPosition("");
    setCoachingBio("");
    setCoachingSports("");
    setSessionPrice("");
    setSessionDurationMinutes("60");
    setCity("");
    setCoachingVenue("");
    setBusinessName("");
    setGstNumber("");
  }, [visible, card, user]);

  useEffect(() => {
    if (!visible) return undefined;

    const forceScrollToField = () => {
      if (!activeFieldKey || !scrollRef.current?.scrollTo) return;
      const y = fieldPositionsRef.current[activeFieldKey];
      if (typeof y !== "number") return;

      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: Math.max(0, y - 140), animated: true });
      }, 40);
    };

    const showSub = Keyboard.addListener("keyboardDidShow", forceScrollToField);
    const willShowSub = Keyboard.addListener("keyboardWillShow", forceScrollToField);

    return () => {
      showSub.remove();
      willShowSub.remove();
    };
  }, [activeFieldKey, visible]);

  const handlePickedAsset = (asset) => {
    if (!asset?.uri) return;
    setAvatarUri(asset.uri);
    setNewAvatarAsset(asset);
    setAvatarRemoved(false);
    setEditing(true);
  };

  const pickerOptions = {
    mediaTypes: "images",
    allowsEditing: false,
    quality: 0.9,
  };

  const openCropModal = (asset) => {
    if (!asset?.uri) return;
    setCropSource({ uri: asset.uri, width: asset.width || 1000, height: asset.height || 1000 });
  };

  const handleCropDone = (croppedAsset) => {
    setCropSource(null);
    handlePickedAsset(croppedAsset);
  };

  const openGallery = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (!result.canceled && result.assets?.[0]) {
        openCropModal(result.assets[0]);
      }
    } catch (err) {
      console.error("openGallery error:", err);
      toast.error("Failed to pick image");
    }
  };

  const openCamera = async () => {
    try {
      const ImagePicker = require("expo-image-picker");
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        toast.error("Camera permission is required");
        return;
      }
      const result = await ImagePicker.launchCameraAsync(pickerOptions);
      if (!result.canceled && result.assets?.[0]) {
        openCropModal(result.assets[0]);
      }
    } catch (err) {
      console.error("openCamera error:", err);
      toast.error("Failed to take photo");
    }
  };

  // Open the custom photo-source sheet (replaces both `Alert.alert` on Android and
  // `ActionSheetIOS` on iOS with one styled modal that matches the rest of the app).
  const pickImage = () => setShowPhotoSheet(true);

  const handleRemoveAvatar = () => {
    setAvatarUri("");
    setNewAvatarAsset(null);
    setAvatarRemoved(true);
    setEditing(true);
  };

  const handleFieldFocus = (inputRef) => {
    const fieldName = Object.entries({
      bio: bioInputRef,
      sports: sportsInputRef,
      preferred_position: preferredPositionInputRef,
      coaching_bio: coachingBioInputRef,
      coaching_sports: coachingSportsInputRef,
      session_price: sessionPriceInputRef,
      session_duration_minutes: sessionDurationInputRef,
      city: cityInputRef,
      coaching_venue: coachingVenueInputRef,
      business_name: businessNameInputRef,
      gst_number: gstNumberInputRef,
    }).find(([, ref]) => ref === inputRef)?.[0];

    const y = fieldName ? fieldPositionsRef.current[fieldName] : null;
    if (fieldName) setActiveFieldKey(fieldName);

    if (typeof y === "number" && scrollRef.current?.scrollTo) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: Math.max(0, y - 140), animated: true });
      }, 30);
    }
  };

  const handleFieldLayout = (fieldName) => (event) => {
    fieldPositionsRef.current[fieldName] = event?.nativeEvent?.layout?.y ?? 0;
  };

  const handleFieldPressIn = (fieldName, inputRef) => () => {
    setActiveFieldKey(fieldName);
    const y = fieldPositionsRef.current[fieldName];
    if (typeof y === "number" && scrollRef.current?.scrollTo) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: Math.max(0, y - 150), animated: true });
      }, 10);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      let uploadedAvatarUrl = avatarUri;

      if (newAvatarAsset) {
        try {
          uploadedAvatarUrl = await uploadService.uploadImage(newAvatarAsset);
        } catch {
          toast.error("Failed to upload avatar");
          setSaving(false);
          return;
        }
      }

      const role = user?.role;
      const authPayload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      if (avatarRemoved) {
        authPayload.avatar = "";
      } else if (newAvatarAsset && uploadedAvatarUrl) {
        authPayload.avatar = uploadedAvatarUrl;
      }

      if (role === "coach") {
        const coachPayload = {
          coaching_bio: coachingBio.trim(),
          coaching_sports: coachingSports
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          session_price: sessionPrice ? Number(sessionPrice) || 0 : 0,
          session_duration_minutes: sessionDurationMinutes ? Number(sessionDurationMinutes) || 60 : 60,
          city: city.trim(),
          coaching_venue: coachingVenue.trim(),
        };

        const [authRes, coachRes] = await Promise.all([
          authService.updateProfile(authPayload),
          coachingService.updateProfile(coachPayload),
        ]);

        updateUser({
          ...user,
          ...authRes,
          ...coachRes,
          avatar: avatarRemoved ? "" : uploadedAvatarUrl || avatarUri || user?.avatar,
        });
      } else {
        const payload = { ...authPayload };

        if (role === "player") {
          payload.bio = bio.trim();
          payload.sports = sports
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          payload.preferred_position = preferredPosition.trim();
        } else if (role === "venue_owner") {
          payload.bio = bio.trim();
          payload.business_name = businessName.trim();
          payload.gst_number = gstNumber.trim();
        } else {
          payload.bio = bio.trim();
        }

        const updatedUser = await authService.updateProfile(payload);
        updateUser({
          ...user,
          ...updatedUser,
          avatar: avatarRemoved ? "" : uploadedAvatarUrl || avatarUri || user?.avatar,
        });
      }

      toast.success("Profile updated");
      notifyChatRead();
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = newAvatarAsset?.uri || (avatarUri ? mediaUrl(avatarUri) : null);
  const metaText = user?.email || (user?.role ? String(user.role).replace("_", " ") : "Update your details");

  const cleanPhone = (v) => {
    let d = v.replace(/\D/g, "");
    if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
    return d.slice(0, 10);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === "ios" ? 12 : 16) }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <X size={16} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.form, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        >
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.avatarTap}>
              <View style={styles.avatarWrap}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={36} color={PRIMARY_COLOR} />
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Camera size={18} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.avatarInfo}>
              <Text style={styles.avatarName}>{name || user?.name || "Player"}</Text>
              <Text style={styles.avatarMeta}>{metaText}</Text>
              {/* <View style={styles.avatarActionsRow}>
                <TouchableOpacity activeOpacity={0.85} onPress={pickImage} style={styles.avatarActionChip}>
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
                {(displayAvatar || avatarRemoved === false) && (avatarUri || user?.avatar || newAvatarAsset?.uri) ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={handleRemoveAvatar} style={styles.avatarRemoveChip}>
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View> */}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Info</Text>
              {!editing ? (
                <TouchableOpacity style={styles.editToggleBtn} onPress={() => setEditing(true)} activeOpacity={0.85}>
                  <Text style={styles.editToggleBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.cancelToggleBtn} onPress={() => setEditing(false)} activeOpacity={0.85}>
                    <Text style={styles.cancelToggleBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveToggleBtn, saving && { opacity: 0.55 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Save size={14} color="#FFFFFF" />
                        <Text style={styles.saveToggleBtnText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {!editing ? (
              /* ── Read-only display (matches web PersonalInfoDisplay) ── */
              <View style={styles.infoDisplayWrap}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{user?.name || "-"}</Text>
                </View>
                {user?.email ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user.email}</Text>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user?.phone || "Not set"}</Text>
                </View>
                {user?.role !== "coach" && (user?.bio || bio) ? (
                  <View style={styles.infoBlockRow}>
                    <Text style={styles.infoBlockLabel}>Bio</Text>
                    <Text style={styles.infoBlockValue}>{user?.bio || bio}</Text>
                  </View>
                ) : null}
                {user?.role !== "coach" && (user?.sports?.length > 0) ? (
                  <View style={styles.infoBlockRow}>
                    <Text style={styles.infoBlockLabel}>Sports</Text>
                    <View style={styles.sportsBadgeWrap}>
                      {user.sports.map((s) => (
                        <View key={s} style={styles.sportBadge}>
                          <Text style={styles.sportBadgeText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                {user?.preferred_position ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Position</Text>
                    <Text style={styles.infoValue}>{user.preferred_position}</Text>
                  </View>
                ) : null}
                {user?.role === "venue_owner" ? (
                  <>
                    {user.business_name ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Business Name</Text><Text style={styles.infoValue}>{user.business_name}</Text></View> : null}
                    {user.gst_number ? <View style={styles.infoRow}><Text style={styles.infoLabel}>GST Number</Text><Text style={styles.infoValue}>{user.gst_number}</Text></View> : null}
                  </>
                ) : null}
                {user?.role === "coach" ? (
                  <>
                    {user.coaching_bio ? <View style={styles.infoBlockRow}><Text style={styles.infoBlockLabel}>Bio</Text><Text style={styles.infoBlockValue}>{user.coaching_bio}</Text></View> : null}
                    {user.coaching_sports?.length > 0 ? (
                      <View style={styles.infoBlockRow}>
                        <Text style={styles.infoBlockLabel}>Sports</Text>
                        <View style={styles.sportsBadgeWrap}>{user.coaching_sports.map((s) => (<View key={s} style={styles.sportBadge}><Text style={styles.sportBadgeText}>{s}</Text></View>))}</View>
                      </View>
                    ) : null}
                    {user.session_price ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Session Price</Text><Text style={styles.infoValue}>₹{user.session_price} / {user.session_duration_minutes || 60} min</Text></View> : null}
                    {user.city ? <View style={styles.infoRow}><Text style={styles.infoLabel}>City</Text><Text style={styles.infoValue}>{user.city}</Text></View> : null}
                    {user.coaching_venue ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Coaching Venue</Text><Text style={styles.infoValue}>{user.coaching_venue}</Text></View> : null}
                  </>
                ) : null}
              </View>
            ) : (
              /* ── Editable fields ── */
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#94A3B8" autoCapitalize="words" />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <View style={styles.phoneRow}>
                    <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
                    <TextInput style={[styles.fieldInput, styles.phoneInput, styles.fieldInputDisabled]} value={phone.replace(/^\+91\s?/, "")} placeholder="98765 43210" placeholderTextColor="#94A3B8" keyboardType="phone-pad" editable={false} />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {user?.role !== "coach" ? (
                  <View style={styles.fieldGroup} onLayout={handleFieldLayout("bio")}>
                    <Text style={styles.fieldLabel}>Bio</Text>
                    <TextInput ref={bioInputRef} style={[styles.fieldInput, styles.textArea]} value={bio} onChangeText={setBio} onPressIn={handleFieldPressIn("bio", bioInputRef)} onFocus={() => handleFieldFocus(bioInputRef)} placeholder="Tell Lobbians about yourself…" placeholderTextColor="#94A3B8" multiline numberOfLines={4} textAlignVertical="top" />
                  </View>
                ) : null}

                {user?.role === "player" ? (
                  <>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("sports")}>
                      <Text style={styles.fieldLabel}>Sports (comma separated)</Text>
                      <TextInput ref={sportsInputRef} style={styles.fieldInput} value={sports} onChangeText={setSports} onPressIn={handleFieldPressIn("sports", sportsInputRef)} onFocus={() => handleFieldFocus(sportsInputRef)} placeholder="Football, Cricket, Badminton" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("preferred_position")}>
                      <Text style={styles.fieldLabel}>Preferred Position</Text>
                      <TextInput ref={preferredPositionInputRef} style={styles.fieldInput} value={preferredPosition} onChangeText={setPreferredPosition} onPressIn={handleFieldPressIn("preferred_position", preferredPositionInputRef)} onFocus={() => handleFieldFocus(preferredPositionInputRef)} placeholder="Midfielder, Goalkeeper…" placeholderTextColor="#94A3B8" />
                    </View>
                  </>
                ) : null}

                {user?.role === "coach" ? (
                  <>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("coaching_bio")}>
                      <Text style={styles.fieldLabel}>Coaching Bio</Text>
                      <TextInput ref={coachingBioInputRef} style={[styles.fieldInput, styles.textArea]} value={coachingBio} onChangeText={setCoachingBio} onPressIn={handleFieldPressIn("coaching_bio", coachingBioInputRef)} onFocus={() => handleFieldFocus(coachingBioInputRef)} placeholder="Tell Lobbians about your coaching experience…" placeholderTextColor="#94A3B8" multiline numberOfLines={4} textAlignVertical="top" />
                    </View>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("coaching_sports")}>
                      <Text style={styles.fieldLabel}>Sports (comma separated)</Text>
                      <TextInput ref={coachingSportsInputRef} style={styles.fieldInput} value={coachingSports} onChangeText={setCoachingSports} onPressIn={handleFieldPressIn("coaching_sports", coachingSportsInputRef)} onFocus={() => handleFieldFocus(coachingSportsInputRef)} placeholder="Football, Cricket, Badminton" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.twoColumnRow}>
                      <View style={[styles.fieldGroup, styles.twoColumnField]} onLayout={handleFieldLayout("session_price")}>
                        <Text style={styles.fieldLabel}>Session Price (₹)</Text>
                        <TextInput ref={sessionPriceInputRef} style={styles.fieldInput} value={sessionPrice} onChangeText={setSessionPrice} onPressIn={handleFieldPressIn("session_price", sessionPriceInputRef)} onFocus={() => handleFieldFocus(sessionPriceInputRef)} placeholder="500" placeholderTextColor="#94A3B8" keyboardType="numeric" />
                      </View>
                      <View style={[styles.fieldGroup, styles.twoColumnField]} onLayout={handleFieldLayout("session_duration_minutes")}>
                        <Text style={styles.fieldLabel}>Duration (mins)</Text>
                        <TextInput ref={sessionDurationInputRef} style={styles.fieldInput} value={sessionDurationMinutes} onChangeText={setSessionDurationMinutes} onPressIn={handleFieldPressIn("session_duration_minutes", sessionDurationInputRef)} onFocus={() => handleFieldFocus(sessionDurationInputRef)} placeholder="60" placeholderTextColor="#94A3B8" keyboardType="numeric" />
                      </View>
                    </View>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("city")}>
                      <Text style={styles.fieldLabel}>City</Text>
                      <TextInput ref={cityInputRef} style={styles.fieldInput} value={city} onChangeText={setCity} onPressIn={handleFieldPressIn("city", cityInputRef)} onFocus={() => handleFieldFocus(cityInputRef)} placeholder="Chennai" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("coaching_venue")}>
                      <Text style={styles.fieldLabel}>Coaching Venue</Text>
                      <TextInput ref={coachingVenueInputRef} style={styles.fieldInput} value={coachingVenue} onChangeText={setCoachingVenue} onPressIn={handleFieldPressIn("coaching_venue", coachingVenueInputRef)} onFocus={() => handleFieldFocus(coachingVenueInputRef)} placeholder="Venue name or address" placeholderTextColor="#94A3B8" />
                    </View>
                  </>
                ) : null}

                {user?.role === "venue_owner" ? (
                  <>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("business_name")}>
                      <Text style={styles.fieldLabel}>Business Name</Text>
                      <TextInput ref={businessNameInputRef} style={styles.fieldInput} value={businessName} onChangeText={setBusinessName} onPressIn={handleFieldPressIn("business_name", businessNameInputRef)} onFocus={() => handleFieldFocus(businessNameInputRef)} placeholder="Your business name" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.fieldGroup} onLayout={handleFieldLayout("gst_number")}>
                      <Text style={styles.fieldLabel}>GST Number</Text>
                      <TextInput ref={gstNumberInputRef} style={styles.fieldInput} value={gstNumber} onChangeText={setGstNumber} onPressIn={handleFieldPressIn("gst_number", gstNumberInputRef)} onFocus={() => handleFieldFocus(gstNumberInputRef)} placeholder="22AAAAA0000A1Z5" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
                    </View>
                  </>
                ) : null}
              </>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowLogout(true)}
            activeOpacity={0.85}
          >
            <LogOut size={16} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>

        <LogoutModal visible={showLogout} onClose={() => setShowLogout(false)} />

        {/* Profile-photo action sheet — replaces system Alert / ActionSheetIOS */}
        <ActionSheetModal
          visible={showPhotoSheet}
          onClose={() => setShowPhotoSheet(false)}
          title="Change Profile Photo"
          actions={[
            { label: "Take Photo", icon: Camera, onPress: openCamera },
            { label: "Choose from Gallery", icon: ImagePlus, onPress: openGallery },
            ...((avatarUri || user?.avatar || newAvatarAsset?.uri)
              ? [{ label: "Remove Photo", icon: Trash2, destructive: true, onPress: handleRemoveAvatar }]
              : []),
          ]}
        />
      </KeyboardAvoidingView>

      {/* Custom crop modal — replaces native Android crop */}
      <ImageCropModal
        visible={!!cropSource}
        imageUri={cropSource?.uri}
        imageWidth={cropSource?.width}
        imageHeight={cropSource?.height}
        onDone={handleCropDone}
        onClose={() => setCropSource(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  saveBtn: {
    minWidth: 74,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  form: {
    padding: 20,
    gap: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarTap: {
    alignSelf: "flex-start",
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: "relative",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E2E8F0",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  avatarMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  removePhotoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
  avatarActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  avatarActionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  avatarRemoveChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0F172A",
  },
  fieldInputDisabled: {
    backgroundColor: "#F1F5F9",
    color: "#94A3B8",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  phonePrefix: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  phoneInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 108,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  fieldHint: {
    fontSize: 12,
    color: "#94A3B8",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  twoColumnField: {
    flex: 1,
  },
  // Edit/Cancel/Save toggles
  editToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  editToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  cancelToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  saveToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  saveToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Read-only info display
  infoDisplayWrap: {
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  infoBlockRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 6,
  },
  infoBlockLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  infoBlockValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 20,
  },
  sportsBadgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
});
