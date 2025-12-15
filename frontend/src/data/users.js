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
    avatar: doctor,
    title: "Clinical Doctor",
    department: "Internal Medicine",
  },
  {
    id: 2,
    role: "admin",
    name: "Admin User",
    email: "admin@pharmalink.com",
    password: "admin123",
    avatar: admin,
    title: "System Administrator",
    department: "Operations",
  },
  {
    id: 3,
    role: "pharmacist",
    name: "John Pharmacist",
    email: "pharmacist@pharmalink.com",
    password: "pharma123",
    avatar: pharmacist,
    title: "Clinical Pharmacist",
    department: "Pharmacy Services",
  },
];
