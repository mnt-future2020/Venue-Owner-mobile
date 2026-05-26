import React, { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Minus, Plus, X } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function PollCreateModal({ visible, onClose, onCreatePoll }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCreate = () => {
    if (!question.trim()) {
      Alert.alert("Validation", "Please enter a question.");
      return;
    }
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      Alert.alert("Validation", "At least 2 non-empty options are required.");
      return;
    }
    onCreatePoll?.(question.trim(), validOptions.map((o) => o.trim()));
    handleReset();
  };

  const handleReset = () => {
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleReset}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Poll</Text>
            <TouchableOpacity onPress={handleReset}>
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={60}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Question */}
            <Text style={styles.label}>Question</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a question..."
              placeholderTextColor="#94A3B8"
              style={styles.questionInput}
              multiline
              maxLength={300}
            />

            {/* Options */}
            <Text style={styles.label}>Options</Text>
            {options.map((opt, idx) => (
              <View key={idx} style={styles.optionRow}>
                <TextInput
                  value={opt}
                  onChangeText={(v) => handleOptionChange(idx, v)}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#94A3B8"
                  style={styles.optionInput}
                  maxLength={100}
                />
                {options.length > MIN_OPTIONS && (
                  <TouchableOpacity
                    style={styles.removeOptionBtn}
                    onPress={() => handleRemoveOption(idx)}
                  >
                    <Minus size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Add option button */}
            {options.length < MAX_OPTIONS && (
              <TouchableOpacity
                style={styles.addOptionBtn}
                onPress={handleAddOption}
              >
                <Plus size={16} color={PRIMARY_COLOR} />
                <Text style={styles.addOptionText}>Add Option</Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollView>

          {/* Create button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create Poll</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  body: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
  },
  questionInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 60,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  removeOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.2)",
    borderStyle: "dashed",
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_COLOR,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  createBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
