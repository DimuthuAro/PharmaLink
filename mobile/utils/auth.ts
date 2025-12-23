import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================
   Types
========================= */

export type Role = "doctor" | "pharmacist" | "admin";

export type AvatarKey = "doctor" | "admin" | "pharmacist";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;

  // Demo avatar identifier
  avatarKey?: AvatarKey;

  // Uploaded image (URI)
  avatarUri?: string | null;
};

/* =========================
   Storage Key
========================= */

const USER_KEY = "pharmalink_user";

/* =========================
   Demo Avatar Images
   (KEEP require() HERE ONLY)
========================= */

export const DEMO_AVATARS: Record<AvatarKey, any> = {
  doctor: require("../assets/images/doctor.jpg"),
  admin: require("../assets/images/admin.jpg"),
  pharmacist: require("../assets/images/pharmacist.jpg"),
};

/* =========================
   Demo Users
========================= */

const DEMO_USERS: Array<{
  id: number;
  email: string;
  password: string;
  name: string;
  role: Role;
  phone: string;
  avatarKey: AvatarKey;
}> = [
  {
    id: 1,
    email: "doctor@pharmalink.com",
    password: "doctor123",
    name: "Dr. Sarah Smith",
    role: "doctor",
    phone: "+94 77 123 4567",
    avatarKey: "doctor",
  },
  {
    id: 2,
    email: "admin@pharmalink.com",
    password: "admin123",
    name: "Admin User",
    role: "admin",
    phone: "+94 71 222 3333",
    avatarKey: "admin",
  },
  {
    id: 3,
    email: "pharmacist@pharmalink.com",
    password: "pharma123",
    name: "John Pharmacist",
    role: "pharmacist",
    phone: "+94 76 444 5555",
    avatarKey: "pharmacist",
  },
];

/* =========================
   Storage Helpers
========================= */

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function setUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

/* =========================
   Login (Demo)
========================= */

export async function loginWithDemo(
  email: string,
  password: string
): Promise<User> {
  const found = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
  );

  if (!found) {
    throw new Error("Invalid email or password.");
  }

  const user: User = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    phone: found.phone,

    // store avatar key (SAFE)
    avatarKey: found.avatarKey,

    // no uploaded image initially
    avatarUri: null,
  };

  await setUser(user);
  return user;
}

/* =========================
   Update User Helper
========================= */

export async function updateUser(
  partial: Partial<User>
): Promise<User | null> {
  const current = await getUser();
  if (!current) return null;

  const updated: User = { ...current, ...partial };
  await setUser(updated);
  return updated;
}
