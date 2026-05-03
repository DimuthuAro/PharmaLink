import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type BrandOption = {
  brand: string;
  generic: string;
  price: number;
  availability: "in-stock" | "limited" | "out-of-stock";
  description: string;
};

type Props = {
  onClose?: () => void;
};

const mockBrands: BrandOption[] = [
  {
    brand: "Aspirin Max",
    generic: "Acetylsalicylic Acid",
    price: 4.99,
    availability: "in-stock",
    description: "Fast-acting pain relief",
  },
  {
    brand: "GeneriSprin",
    generic: "Acetylsalicylic Acid",
    price: 2.49,
    availability: "in-stock",
    description: "Cost-effective alternative",
  },
  {
    brand: "PainAway",
    generic: "Acetylsalicylic Acid",
    price: 3.99,
    availability: "limited",
    description: "Extended relief formula",
  },
];

const availabilityStyles = {
  "in-stock": { bg: "rgba(34,197,94,0.12)", text: "#166534", label: "In Stock" },
  "limited": { bg: "rgba(245,158,11,0.12)", text: "#92400e", label: "Limited" },
  "out-of-stock": { bg: "rgba(239,68,68,0.12)", text: "#991b1b", label: "Out of Stock" },
};

export default function CrossBrandInterpreter({ onClose }: Props) {
  const [medicineName, setMedicineName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BrandOption[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!medicineName.trim()) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setResults(mockBrands);
    setSearched(true);
    setLoading(false);
  };

  const cheapest = results.length > 0 ? Math.min(...results.map((r) => r.price)) : 0;
  const savings =
    results.length > 0
      ? (Math.max(...results.map((r) => r.price)) - cheapest).toFixed(2)
      : "0.00";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MaterialCommunityIcons name="compare" size={24} color="#f59e0b" />
          <View>
            <Text style={styles.title}>Cross-Brand Comparator</Text>
            <Text style={styles.subtitle}>Find alternative brands & prices</Text>
          </View>
        </View>
        {onClose && (
          <Pressable onPress={onClose} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Medicine Name</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g., Aspirin, Ibuprofen"
              value={medicineName}
              onChangeText={setMedicineName}
              editable={!loading}
            />
            <Pressable
              onPress={handleSearch}
              disabled={loading || !medicineName.trim()}
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && { opacity: 0.8 },
                (loading || !medicineName.trim()) && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Results */}
        {searched && results.length > 0 && (
          <>
            {/* Savings Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Generic Name</Text>
                <Text style={styles.summaryValue}>{results[0].generic}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Max Savings</Text>
                <Text style={styles.summaryValue}>Rs {savings}</Text>
              </View>
            </View>

            {/* Brand Options */}
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Available Options ({results.length})</Text>
            </View>

            {results.map((brand, idx) => {
              const avail = availabilityStyles[brand.availability];
              const isCheapest = brand.price === cheapest;

              return (
                <View key={idx} style={[styles.brandCard, isCheapest && styles.bestPriceBadge]}>
                  {isCheapest && (
                    <View style={styles.bestPriceLabel}>
                      <MaterialCommunityIcons name="star-circle" size={16} color="#fff" />
                      <Text style={styles.bestPriceText}>Best Price</Text>
                    </View>
                  )}

                  <View style={styles.brandTop}>
                    <View style={styles.brandInfo}>
                      <Text style={styles.brandName}>{brand.brand}</Text>
                      <Text style={styles.genericName}>{brand.generic}</Text>
                    </View>
                    <Text style={styles.price}>Rs {brand.price}</Text>
                  </View>

                  <Text style={styles.description}>{brand.description}</Text>

                  <View style={styles.brandBottom}>
                    <View style={[styles.availabilityBadge, { backgroundColor: avail.bg }]}>
                      <Text style={[styles.availabilityText, { color: avail.text }]}>
                        {avail.label}
                      </Text>
                    </View>
                    <Pressable style={styles.selectBtn}>
                      <Text style={styles.selectBtnText}>Select</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {searched && results.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No alternatives found</Text>
            <Text style={styles.emptySubtitle}>Try searching with a different medicine name</Text>
          </View>
        )}

        {!searched && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="magnify" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Search for a medicine</Text>
            <Text style={styles.emptySubtitle}>
              Find alternative brands and compare prices
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
  },
  searchBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f59e0b",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e5e5",
    marginHorizontal: 12,
  },
  optionsHeader: {
    marginBottom: 12,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  brandCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  bestPriceBadge: {
    borderColor: "#fbbf24",
    backgroundColor: "rgba(251,191,36,0.05)",
  },
  bestPriceLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f59e0b",
  },
  bestPriceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
  },
  brandTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  genericName: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f59e0b",
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  brandBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
  },
});
