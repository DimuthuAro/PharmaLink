import React from "react";
import { router } from "expo-router";
import CrossBrandInterpreter from "../components/CrossBrandInterpreter";

export default function ComparatorScreen() {
  return <CrossBrandInterpreter onClose={() => router.back()} />;
}
