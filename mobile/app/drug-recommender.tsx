import React from "react";
import { router } from "expo-router";
import TreatmentIdentifier from "../components/TreatmentIdentifier";

export default function DrugRecommenderScreen() {
  return <TreatmentIdentifier onClose={() => router.back()} />;
}
