import AsyncStorage from "@react-native-async-storage/async-storage";

export type Role = "doctor" | "pharmacist" | "admin";

export type User = {
  name: string;
  email: string;
  role: Role;
};

const USER_KEY = "pharmalink_user";

// Demo credentials (like your web app)
const DEMO_USERS: Array<{ email: string; password: string; name: string; role: Role }> = [
  { email: "admin@pharmalink.com", password: "admin123", name: "Admin", role: "admin" },
  { email: "doctor@pharmalink.com", password: "doctor123", name: "Dr. John", role: "doctor" },
  { email: "pharmacist@pharmalink.com", password: "pharm123", name: "John Pharmacist", role: "pharmacist" },
];

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

export async function loginWithDemo(email: string, password: string): Promise<User> {
  const found = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!found) throw new Error("Invalid email or password.");

  const user: User = { name: found.name, email: found.email, role: found.role };
  await setUser(user);
  return user;
}
