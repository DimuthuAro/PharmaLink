import React from "react";
import { router } from "expo-router";
import DrugInteractionChecker from "../components/DrugInteractionChecker";

export default function InteractionCheckScreen() {
  return <DrugInteractionChecker onClose={() => router.back()} />;
}
