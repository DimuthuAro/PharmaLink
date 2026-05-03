import React from "react";
import { router } from "expo-router";
import PrescriptionAnalyzer from "../components/PrescriptionAnalyzer";

export default function PrescriptionScreen() {
  return <PrescriptionAnalyzer onClose={() => router.back()} />;
}
