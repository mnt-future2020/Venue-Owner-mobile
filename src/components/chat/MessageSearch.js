import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Search, X } from "lucide-react-native";
import chatService from "../../services/chatService";
import { PRIMARY_COLOR } from "../../constants/theme";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

const SearchResultItem = React.memo(function SearchResultItem({ item, onSelect }) {
  const sender = item.sender?.name || item.user?.name || "Unknown";
  const content = item.content || item.text || "";
  const time = formatTime(item.created_at);
  const handlePress = useCallback(() => onSelect?.(item), [onSelect, item]);

  return (
    <Pressable style={styles.resultItem} onPress={handlePress}>
      <View style={styles.resultHeader}>
        <Text style={styles.senderName} numberOfLines={1}>
          {sender}
        </Text>
        <Text style={styles.resultTime}>{time}</Text>
      </View>
      <Text style={styles.resultContent} numberOfLines={2}>
        {content}
      </Text>
    </Pressable>
  );
});

export default function MessageSearch({
  conversationId,
  isGroup,
  onSelectMessage,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(
    async (q) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        let data;
        if (isGroup) {
          data = await chatService.searchGroupMessages(conversationId, trimmed);
        } else {
          data = await chatService.searchMessages(conversationId, trimmed);
        }
        setResults(data?.messages || data?.results || data || []);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, isGroup]
  );

  const handleChangeText = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const renderItem = useCallback(({ item }) => (
    <SearchResultItem item={item} onSelect={onSelectMessage} />
  ), [onSelectMessage]);

  const renderEmpty = () => {
    if (loading) return null;
    if (!searched) return null;
    return (
      <View style={styles.emptyContainer}>
        <Search size={32} color="#D1D5DB" />
        <Text style={styles.emptyText}>No messages found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleChangeText}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear}>
            <X size={18} color="#9CA3AF" />
          </Pressable>
        )}
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
         
        >
          <Text style={styles.closeBtnText}>Cancel</Text>
        </Pressable>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
        </View>
      )}

      {/* Results */}
      <FlashList
        data={results}
        keyExtractor={(item) =>
          item._id || item.id || Math.random().toString()
        }
        renderItem={renderItem}
        estimatedItemSize={72}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          results.length === 0 ? styles.emptyList : undefined
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 6,
  },
  closeBtn: {
    paddingLeft: 8,
  },
  closeBtnText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  resultTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  resultContent: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  emptyList: {
    flexGrow: 1,
  },
});
