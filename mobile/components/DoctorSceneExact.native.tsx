import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

type Props = {
  speaking?: boolean;
  width?: number;
  height?: number;
};

export default function DoctorSceneExact({
  speaking = false,
  width = 220,
  height = 260,
}: Props) {
  const html = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }

    .wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }

    .root {
      width: ${width}px;
      height: ${height}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scene {
      position: relative;
      user-select: none;
    }

    .body-group { animation: float 3.2s ease-in-out infinite; transform-origin: center bottom; }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

    .head-g { animation: headBob 3.2s ease-in-out infinite; transform-origin: 110px 72px; }
    @keyframes headBob { 0%,100%{transform:rotate(0deg)} 30%{transform:rotate(1.5deg)} 70%{transform:rotate(-1deg)} }

    .blink-g { animation: blink 4.5s ease-in-out infinite; transform-origin: center; }
    @keyframes blink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.08)} }

    .coat-l { animation: coatL 3.2s ease-in-out infinite; transform-origin: 75px 145px; }
    @keyframes coatL { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(1.5deg)} }

    .coat-r { animation: coatR 3.2s ease-in-out infinite; transform-origin: 145px 145px; }
    @keyframes coatR { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-1.5deg)} }

    .arm-l { animation: armL 3.2s ease-in-out infinite; transform-origin: 80px 160px; }
    @keyframes armL { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(3deg)} }

    .arm-r { animation: armR 3.2s ease-in-out infinite; transform-origin: 140px 160px; }
    @keyframes armR { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-3deg)} }

    .clip-g { animation: clipF 3.2s ease-in-out infinite; transform-origin: 155px 195px; }
    @keyframes clipF { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg) translateY(-3px)} }

    .stetho-g { animation: steth 3.2s ease-in-out infinite; transform-origin: 90px 165px; }
    @keyframes steth { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(2.5deg)} }

    .shadow-e { animation: shadowP 3.2s ease-in-out infinite; transform-origin: 110px 248px; }
    @keyframes shadowP { 0%,100%{transform:scaleX(1);opacity:.18} 50%{transform:scaleX(.82);opacity:.09} }

    .pulse-r { animation: pulseR 1.8s ease-out infinite; transform-origin: 110px 110px; opacity: 0; }
    @keyframes pulseR { 0%{opacity:.6;transform:scale(.9)} 100%{opacity:0;transform:scale(1.25)} }

    .speaking .pulse-r { opacity: 1; animation: pulseR 1.2s ease-out infinite; }
    .speaking .mouth-s { animation: talk .32s ease-in-out infinite alternate; transform-origin: 110px 98px; }
    @keyframes talk { from{transform:scaleY(1)} to{transform:scaleY(1.8) translateY(-1px)} }

    .speaking .head-g { animation: headTalk .7s ease-in-out infinite; transform-origin: 110px 72px; }
    @keyframes headTalk { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(2deg) translateY(-2px)} }

    .speaking .body-group { animation: floatTalk .9s ease-in-out infinite; }
    @keyframes floatTalk { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="root">
      <div class="scene ${speaking ? "speaking" : ""}">
        <svg width="${width}" height="${height}" viewBox="0 0 220 260" fill="none">
          <ellipse class="shadow-e" cx="110" cy="248" rx="52" ry="8" fill="#888" />
          <g class="body-group">
            <g class="coat-l"><path d="M68 148 Q58 165 56 200 Q56 215 65 220 L78 220 L80 165 Z" fill="#f0f4ff" stroke="#c5cef7" stroke-width="0.8"/></g>
            <g class="coat-r"><path d="M152 148 Q162 165 164 200 Q164 215 155 220 L142 220 L140 165 Z" fill="#f0f4ff" stroke="#c5cef7" stroke-width="0.8"/></g>
            <rect x="76" y="142" width="68" height="82" rx="8" fill="#f8f9ff" stroke="#c5cef7" stroke-width="0.8"/>
            <g class="stetho-g">
              <path d="M88 158 Q82 178 88 188 Q94 198 100 192" stroke="#7F77DD" stroke-width="2.2" fill="none" stroke-linecap="round"/>
              <circle cx="100" cy="191" r="4.5" fill="none" stroke="#7F77DD" stroke-width="2"/>
              <circle cx="100" cy="191" r="2" fill="#7F77DD"/>
              <circle cx="88" cy="158" r="3" fill="#7F77DD"/>
              <circle cx="84" cy="155" r="2" fill="#534AB7"/>
            </g>
            <g class="clip-g">
              <rect x="135" y="168" width="22" height="28" rx="3" fill="white" stroke="#c5cef7" stroke-width="0.8"/>
              <rect x="139" y="165" width="14" height="5" rx="2.5" fill="#c5cef7"/>
              <line x1="138" y1="176" x2="154" y2="176" stroke="#c5cef7" stroke-width="1"/>
              <line x1="138" y1="181" x2="154" y2="181" stroke="#c5cef7" stroke-width="1"/>
              <line x1="138" y1="186" x2="148" y2="186" stroke="#c5cef7" stroke-width="1"/>
            </g>
            <g class="arm-l">
              <path d="M76 155 Q62 168 60 190" stroke="#e8eeff" stroke-width="14" stroke-linecap="round" fill="none"/>
              <path d="M76 155 Q62 168 60 190" stroke="#c5cef7" stroke-width="0.8" stroke-linecap="round" fill="none"/>
              <ellipse cx="60" cy="193" rx="7" ry="5" fill="#fde5d7" stroke="#f0c4ae" stroke-width="0.8"/>
            </g>
            <g class="arm-r">
              <path d="M144 155 Q158 168 160 190" stroke="#e8eeff" stroke-width="14" stroke-linecap="round" fill="none"/>
              <path d="M144 155 Q158 168 160 190" stroke="#c5cef7" stroke-width="0.8" stroke-linecap="round" fill="none"/>
              <ellipse cx="160" cy="193" rx="7" ry="5" fill="#fde5d7" stroke="#f0c4ae" stroke-width="0.8"/>
            </g>
            <rect x="90" y="155" width="40" height="18" rx="5" fill="white" stroke="#c5cef7" stroke-width="0.8"/>
            <text x="110" y="168" text-anchor="middle" font-size="8" fill="#7F77DD" font-family="sans-serif" font-weight="600">ADVISORY</text>
            <g class="head-g">
              <ellipse cx="110" cy="62" rx="38" ry="42" fill="#fde5d7" stroke="#f0c4ae" stroke-width="0.8"/>
              <ellipse cx="96" cy="72" rx="5" ry="6" fill="#fad3be"/>
              <ellipse cx="124" cy="72" rx="5" ry="6" fill="#fad3be"/>
              <path d="M82 45 Q110 28 138 45 Q138 30 110 22 Q82 30 82 45Z" fill="#3a2a6d"/>
              <path d="M82 42 Q90 35 110 32 Q130 35 138 42" fill="#3a2a6d"/>
              <g class="blink-g"><ellipse cx="98" cy="65" rx="7" ry="8" fill="white" stroke="#e8d5c5" stroke-width="0.5"/><ellipse cx="98" cy="66" rx="5" ry="5.5" fill="#3d2b1f"/><ellipse cx="98" cy="66" rx="3" ry="3" fill="#1a0f0a"/><circle cx="100" cy="64" r="1.5" fill="white"/></g>
              <g class="blink-g"><ellipse cx="122" cy="65" rx="7" ry="8" fill="white" stroke="#e8d5c5" stroke-width="0.5"/><ellipse cx="122" cy="66" rx="5" ry="5.5" fill="#3d2b1f"/><ellipse cx="122" cy="66" rx="3" ry="3" fill="#1a0f0a"/><circle cx="124" cy="64" r="1.5" fill="white"/></g>
              <ellipse cx="93" cy="78" rx="4" ry="2.5" fill="#f5b8a0" opacity="0.6"/>
              <ellipse cx="127" cy="78" rx="4" ry="2.5" fill="#f5b8a0" opacity="0.6"/>
              <ellipse cx="110" cy="74" rx="3.5" ry="4" fill="#f0c4ae"/>
              <path class="mouth-s" d="M102 88 Q110 95 118 88" stroke="#c47a5a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <path d="M80 58 Q72 65 74 78" stroke="#f0c4ae" stroke-width="4" stroke-linecap="round" fill="none"/>
              <path d="M140 58 Q148 65 146 78" stroke="#f0c4ae" stroke-width="4" stroke-linecap="round" fill="none"/>
              <rect x="96" y="102" width="28" height="36" rx="4" fill="#fde5d7" stroke="#f0c4ae" stroke-width="0.5"/>
              <path d="M96 115 Q110 120 124 115" fill="#e8c9b4"/>
              <path d="M104 104 Q110 100 116 104" stroke="#3a2a6d" stroke-width="2" fill="none"/>
            </g>
          </g>
          <circle class="pulse-r" cx="110" cy="110" r="70" fill="none" stroke="#7F77DD" stroke-width="1.5"/>
        </svg>
      </div>
    </div>
  </div>
</body>
</html>
`,
    [speaking, width, height]
  );

  return (
    <View style={{ width, height, backgroundColor: "transparent" }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        style={{ width, height, backgroundColor: "transparent" }}
      />
    </View>
  );
}