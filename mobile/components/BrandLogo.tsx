import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type BrandLogoProps = {
  withText?: boolean;
  size?: number;
};

export default function BrandLogo({
  withText = true,
  size = 36,
}: BrandLogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/PharmLinkLogo.png")}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />

      {withText && (
        <View style={styles.textWrap}>
          <Text style={styles.brandText}>
            Pharm<Text style={styles.linkText}>Link</Text>
          </Text>
          <Text style={styles.subText}>
            DRUG AVAILABILITY & ACCESSIBILITY
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  textWrap: {
    marginLeft: 8,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  linkText: {
    color: "#3B82F6",
  },
  subText: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 2,
    letterSpacing: 0.4,
  },
});