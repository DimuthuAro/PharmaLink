import React, { useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle } from "react-native";

type User = {
  name?: string;
  avatar?: string;
};

type UserAvatarProps = {
  user?: User | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 40,
  style,
  imageStyle,
}) => {
  const [imgError, setImgError] = useState(false);

  const initials = useMemo(() => {
    const name = user?.name?.trim() || "User";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user?.name]);

  const canShowImage = Boolean(user?.avatar) && !imgError;

  if (canShowImage) {
    return (
      <Image
        source={{ uri: user?.avatar }}
        accessibilityLabel={user?.name || "User"}
        onError={() => setImgError(true)}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          imageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fallback: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default UserAvatar; 