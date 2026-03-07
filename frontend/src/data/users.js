import doctor from "../assets/doctor.jpg";
import admin from "../assets/admin.jpg";
import pharmacist from "../assets/pharamacy.jpg";

export const USERS = [
  {
    id: 1,
    role: "doctor",
    name: "Dr. Sarah Smith",
    email: "doctor@pharmalink.com",
    password: "pharma123",
    phone: "+94 77 123 4567",
    avatar: doctor,
  },
  {
    id: 2,
    role: "admin",
    name: "Admin User",
    email: "admin@pharmalink.com",
    password: "admin123",
    phone: "+94 71 222 3333",
    avatar: admin,
  },
  {
    id: 3,
    role: "pharmacist",
    name: "John Pharmacist",
    email: "pharmacist@pharmalink.com",
    password: "pharma123",
    phone: "+94 76 444 5555",
    avatar: pharmacist,
  },
];
