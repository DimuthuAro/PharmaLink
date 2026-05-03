import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AutoCompleteProps<T> = {
  label?: string | null;
  placeholder: string;
  value: string;
  onChangeValue: (val: string) => void;
  fetcher: (q: string) => Promise<T[]>;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
};

export default function AutoComplete<T>({
  label,
  placeholder,
  value,
  onChangeValue,
  fetcher,
  onSelect,
  getLabel,
}: AutoCompleteProps<T>) {
  const [options, setOptions] = useState<T[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value.trim()) {
      setOptions([]);
      setShow(false);
    }
  }, [value]);

  const handleSearch = async (val: string) => {
    onChangeValue(val);

    if (!val.trim()) {
      setOptions([]);
      setShow(false);
      return;
    }

    setShow(true);

    try {
      setLoading(true);
      const res = await fetcher(val);
      setOptions(Array.isArray(res) ? res : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputOuter}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" />
        <TextInput
          value={value}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          style={styles.input}
          onFocus={() => {
            if (options.length > 0) setShow(true);
          }}
          onBlur={() => {
            setTimeout(() => setShow(false), 150);
          }}
        />
      </View>

      {show && (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#2f2971" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          ) : (
            options.map((item, index) => {
              const title = getLabel(item);

              return (
                <TouchableOpacity
                  key={`${title}-${index}`}
                  style={styles.option}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelect(item);
                    setShow(false);
                    setOptions([]);
                  }}
                >
                  <Text style={styles.optionText}>{title}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    zIndex: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 7,
  },
  inputOuter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    padding: 0,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 14,
    overflow: "hidden",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#64748B",
  },
  emptyRow: {
    padding: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
});