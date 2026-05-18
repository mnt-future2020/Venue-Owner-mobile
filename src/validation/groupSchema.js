/**
 * Group Form Validation Schema
 * 
 * This schema ensures consistent validation between Create and Edit Group forms.
 * Both forms must validate against these rules.
 */

import { SPORTS_DATA } from "../components/shared/SportPicker";

// Extract valid sport keys from SPORTS_DATA
const VALID_SPORT_KEYS = SPORTS_DATA.map((sport) => sport.key);

/**
 * Validates group form data
 * @param {Object} formData - The form data to validate
 * @param {string} formData.name - Group name (required)
 * @param {string} formData.description - Group description (optional)
 * @param {string} formData.sport - Sport key (optional, must be from SPORTS_DATA)
 * @param {boolean} formData.is_private - Privacy setting
 * @param {number|string} formData.max_members - Maximum members (2-5000)
 * @param {string} formData.group_type - Group type: "community" or "club"
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateGroupForm(formData) {
  const errors = {};

  // Name validation (required, 3-100 characters)
  if (!formData.name || !formData.name.trim()) {
    errors.name = "Group name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Group name must be at least 3 characters";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Group name must be less than 100 characters";
  }

  // Description validation (optional, max 500 characters)
  if (formData.description && formData.description.length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  // Sport validation (optional, must be valid sport key)
  if (formData.sport && !VALID_SPORT_KEYS.includes(formData.sport)) {
    errors.sport = "Invalid sport selected";
  }

  // Group type validation (required, must be "community" or "club")
  if (!formData.group_type) {
    errors.group_type = "Group type is required";
  } else if (!["community", "club"].includes(formData.group_type)) {
    errors.group_type = "Invalid group type";
  }

  // Max members validation (required, 2-5000)
  const maxMembers = parseInt(formData.max_members, 10);
  if (isNaN(maxMembers)) {
    errors.max_members = "Max members must be a number";
  } else if (maxMembers < 2) {
    errors.max_members = "Max members must be at least 2";
  } else if (maxMembers > 5000) {
    errors.max_members = "Max members cannot exceed 5000";
  }

  // Group type specific validation
  if (formData.group_type === "club" && maxMembers > 20) {
    errors.max_members = "Club groups cannot have more than 20 members";
  } else if (formData.group_type === "community" && maxMembers > 50) {
    errors.max_members = "Community groups cannot have more than 50 members";
  }

  // Privacy validation (must be boolean)
  if (typeof formData.is_private !== "boolean") {
    errors.is_private = "Privacy setting must be true or false";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitizes group form data before submission
 * @param {Object} formData - The form data to sanitize
 * @returns {Object} Sanitized form data
 */
export function sanitizeGroupForm(formData) {
  return {
    name: formData.name?.trim() || "",
    description: formData.description?.trim() || "",
    sport: formData.sport || "",
    group_type: formData.group_type || "community",
    is_private: !!formData.is_private,
    max_members: parseInt(formData.max_members, 10) || 50,
    avatar_url: formData.avatar_url || "",
    cover_url: formData.cover_url || "",
  };
}

/**
 * Gets default form values based on group type
 * @param {string} groupType - "community" or "club"
 * @returns {Object} Default form values
 */
export function getDefaultGroupForm(groupType = "community") {
  return {
    name: "",
    description: "",
    sport: "",
    group_type: groupType,
    is_private: false,
    max_members: groupType === "club" ? "20" : "50",
    avatar_url: "",
    cover_url: "",
  };
}
