import { Platform } from "react-native";

const DoctorSceneExact =
  Platform.OS === "web"
    ? require("./DoctorSceneExact.web").default
    : require("./DoctorSceneExact.native").default;

export default DoctorSceneExact;