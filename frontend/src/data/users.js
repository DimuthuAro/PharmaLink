import doctor from "../assets/doctor.jpg";
import admin from "../assets/admin.jpg";
import pharmacist from "../assets/pharamacy.jpg";

export const USERS = [
  {
    id: 1,
    role: "patient1",
    name: "Sarah Smith",
    email: "sarah@pharmalink.com",
    password: "pharma123",
    phone: "+94 77 123 4567",
    avatar: doctor,
  },
  {
    id: 2,
    role: "patient2",
    name: "Michael Johnson",
    email: "michael@pharmalink.com",
    password: "admin123",
    phone: "+94 71 222 3333",
    avatar: admin,
  },
  {
    id: 3,
    role: "patient3",
    name: "John Doe",
    email: "john@pharmalink.com",
    password: "pharma123",
    phone: "+94 76 444 5555",
    avatar: pharmacist,
  },
];
