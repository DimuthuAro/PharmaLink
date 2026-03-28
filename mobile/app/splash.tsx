// app/splash.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle, Line, G } from "react-native-svg";
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing as REasing,
} from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

const NAVY = "#1B2A6B";
const DARK_NAVY = "#0D1640";
const BLUE = "#2E6BE6";
const LIGHT_BLUE = "#5B9CF6";
const WHITE = "#FFFFFF";
const GREEN = "#4ADE80";

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedLine = Reanimated.createAnimatedComponent(Line);

function CircuitDot({
  cx,
  cy,
  delayMs,
  size = 5,
  color = LIGHT_BLUE,
}: {
  cx: number;
  cy: number;
  delayMs: number;
  size?: number;
  color?: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: REasing.out(REasing.quad) }),
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 500, easing: REasing.in(REasing.quad) }),
          withTiming(0, { duration: 1400 })
        ),
        -1,
        false
      )
    );
  }, [delayMs, progress]);

  const animProps = useAnimatedProps(() => ({
    r: size * 0.6 + progress.value * size * 0.4,
    fillOpacity: progress.value * 0.95,
  }));

  return <AnimatedCircle cx={cx} cy={cy} animatedProps={animProps} fill={color} />;
}

function Trace({
  x1,
  y1,
  x2,
  y2,
  delayMs,
  dur = 700,
  color = LIGHT_BLUE,
  sw = 1.5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delayMs: number;
  dur?: number;
  color?: string;
  sw?: number;
}) {
  const prog = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    prog.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: dur, easing: REasing.out(REasing.quad) }),
          withTiming(1, { duration: 700 }),
          withTiming(0, { duration: 0 }),
          withTiming(0, { duration: 1600 })
        ),
        -1,
        false
      )
    );

    op.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: 180 }),
          withTiming(0.75, { duration: dur + 520 }),
          withTiming(0, { duration: 400 }),
          withTiming(0, { duration: 1200 })
        ),
        -1,
        false
      )
    );
  }, [delayMs, dur, op, prog]);

  const animProps = useAnimatedProps(() => ({
    x2: x1 + prog.value * (x2 - x1),
    y2: y1 + prog.value * (y2 - y1),
    opacity: op.value,
  }));

  return (
    <AnimatedLine
      x1={x1}
      y1={y1}
      animatedProps={animProps}
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
    />
  );
}

function PulseRing({
  cx,
  cy,
  baseR,
  delayMs,
}: {
  cx: number;
  cy: number;
  baseR: number;
  delayMs: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: REasing.out(REasing.ease) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [baseR, delayMs, progress]);

  const animProps = useAnimatedProps(() => ({
    r: baseR + progress.value * (baseR * 0.85),
    opacity: (1 - progress.value) * 0.55,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      animatedProps={animProps}
      fill="none"
      stroke={BLUE}
      strokeWidth={1.5}
    />
  );
}

function OrbitDot({
  cx,
  cy,
  orbitR,
  periodMs,
  startDeg,
  color,
  dotR = 4.5,
}: {
  cx: number;
  cy: number;
  orbitR: number;
  periodMs: number;
  startDeg: number;
  color: string;
  dotR?: number;
}) {
  const angle = useSharedValue(startDeg);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(startDeg + 360, { duration: periodMs, easing: REasing.linear }),
      -1,
      false
    );
  }, [angle, periodMs, startDeg]);

  const animProps = useAnimatedProps(() => {
    const rad = (angle.value * Math.PI) / 180;
    return {
      cx: cx + orbitR * Math.cos(rad),
      cy: cy + orbitR * Math.sin(rad),
    };
  });

  return <AnimatedCircle animatedProps={animProps} r={dotR} fill={color} opacity={0.88} />;
}

function ChevronDraw({
  cx,
  cy,
  armLen,
  delayMs,
}: {
  cx: number;
  cy: number;
  armLen: number;
  delayMs: number;
}) {
  const prog = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(delayMs, withTiming(1, { duration: 250 }));
    prog.value = withDelay(
      delayMs + 200,
      withTiming(1, { duration: 520, easing: REasing.out(REasing.quad) })
    );
  }, [delayMs, op, prog]);

  const leftProps = useAnimatedProps(() => ({
    x1: cx - armLen,
    y1: cy - armLen * 0.65,
    x2: cx - armLen + prog.value * armLen,
    y2: cy - armLen * 0.65 + prog.value * armLen * 0.65,
    opacity: op.value,
  }));

  const rightProps = useAnimatedProps(() => ({
    x1: cx + armLen,
    y1: cy - armLen * 0.65,
    x2: cx + armLen - prog.value * armLen,
    y2: cy - armLen * 0.65 + prog.value * armLen * 0.65,
    opacity: op.value,
  }));

  return (
    <G>
      <AnimatedLine animatedProps={leftProps} stroke={WHITE} strokeWidth={7} strokeLinecap="round" />
      <AnimatedLine animatedProps={rightProps} stroke={WHITE} strokeWidth={7} strokeLinecap="round" />
    </G>
  );
}

function BounceDot({ delay }: { delay: number }) {
  const ty = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(ty, {
          toValue: -7,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(560 - delay),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [delay, ty]);

  return <Animated.View style={[styles.dot, { transform: [{ translateY: ty }] }]} />;
}

export default function SplashScreen() {
  const { isAuthenticated, loading } = useAuth();

  const bgFade = React.useRef(new Animated.Value(0)).current;
  const cardOp = React.useRef(new Animated.Value(0)).current;
  const cardY = React.useRef(new Animated.Value(48)).current;
  const shieldOp = React.useRef(new Animated.Value(0)).current;
  const shieldSc = React.useRef(new Animated.Value(0.6)).current;
  const wordOp = React.useRef(new Animated.Value(0)).current;
  const wordY = React.useRef(new Animated.Value(14)).current;
  const tagOp = React.useRef(new Animated.Value(0)).current;
  const barScale = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgFade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardOp, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(shieldOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(shieldSc, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordOp, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(wordY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(barScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [barScale, bgFade, cardOp, cardY, shieldOp, shieldSc, tagOp, wordOp, wordY]);

  useEffect(() => {
    if (loading) return;

    const t = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/(tabs)");
      }
    }, 6800);

    return () => clearTimeout(t);
  }, [isAuthenticated, loading]);

  return (
    <Animated.View style={[styles.container, { opacity: bgFade }]}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />
      <View style={[styles.glow, { top: -80, left: -80, width: 260, height: 260 }]} />
      <View
        style={[
          styles.glow,
          { bottom: -100, right: -100, width: 300, height: 300, opacity: 0.1 },
        ]}
      />

      <Animated.View style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardY }] }]}>
        <View style={styles.cardBar} />

        <Animated.View style={{ opacity: shieldOp, transform: [{ scale: shieldSc }] }}>
          <Svg width={260} height={200} viewBox="0 0 260 200">
            <PulseRing cx={130} cy={95} baseR={58} delayMs={0} />
            <PulseRing cx={130} cy={95} baseR={58} delayMs={800} />

            <Trace x1={14} y1={74} x2={62} y2={74} delayMs={300} sw={1.5} />
            <Trace x1={62} y1={74} x2={62} y2={95} delayMs={550} sw={1.2} />
            <Trace x1={62} y1={95} x2={74} y2={95} delayMs={730} sw={1.2} />
            <Trace x1={32} y1={74} x2={32} y2={50} delayMs={420} sw={1.0} />
            <Trace x1={32} y1={50} x2={58} y2={50} delayMs={600} sw={1.0} />
            <Trace x1={14} y1={100} x2={50} y2={100} delayMs={660} sw={0.8} />
            <Trace x1={50} y1={100} x2={50} y2={116} delayMs={850} sw={0.8} />
            <Trace x1={50} y1={116} x2={74} y2={116} delayMs={960} sw={0.8} />

            <CircuitDot cx={14} cy={74} delayMs={300} size={5} />
            <CircuitDot cx={62} cy={74} delayMs={660} size={4} />
            <CircuitDot cx={62} cy={95} delayMs={840} size={3.5} />
            <CircuitDot cx={32} cy={50} delayMs={500} size={4} />
            <CircuitDot cx={58} cy={50} delayMs={700} size={5} />
            <CircuitDot cx={14} cy={100} delayMs={760} size={3.5} />

            <Trace x1={246} y1={74} x2={198} y2={74} delayMs={350} sw={1.5} />
            <Trace x1={198} y1={74} x2={198} y2={95} delayMs={600} sw={1.2} />
            <Trace x1={198} y1={95} x2={186} y2={95} delayMs={780} sw={1.2} />
            <Trace x1={228} y1={74} x2={228} y2={50} delayMs={470} sw={1.0} />
            <Trace x1={228} y1={50} x2={202} y2={50} delayMs={650} sw={1.0} />
            <Trace x1={246} y1={100} x2={210} y2={100} delayMs={710} sw={0.8} />
            <Trace x1={210} y1={100} x2={210} y2={116} delayMs={900} sw={0.8} />
            <Trace x1={210} y1={116} x2={186} y2={116} delayMs={1010} sw={0.8} />

            <CircuitDot cx={246} cy={74} delayMs={350} size={5} />
            <CircuitDot cx={198} cy={74} delayMs={710} size={4} />
            <CircuitDot cx={198} cy={95} delayMs={890} size={3.5} />
            <CircuitDot cx={228} cy={50} delayMs={550} size={4} />
            <CircuitDot cx={202} cy={50} delayMs={750} size={5} />
            <CircuitDot cx={246} cy={100} delayMs={810} size={3.5} />

            <OrbitDot cx={130} cy={95} orbitR={58} periodMs={4200} startDeg={0} color={LIGHT_BLUE} dotR={5} />
            <OrbitDot cx={130} cy={95} orbitR={46} periodMs={6800} startDeg={180} color={BLUE} dotR={4} />

            <Path
              d="M130 22 L184 44 L184 116 Q184 154 130 174 Q76 154 76 116 L76 44 Z"
              fill={DARK_NAVY}
              stroke={BLUE}
              strokeWidth={2}
            />
            <Path
              d="M130 32 L174 52 L174 112 Q174 144 130 162 Q86 144 86 112 L86 52 Z"
              fill={NAVY}
              stroke={LIGHT_BLUE}
              strokeWidth={0.8}
              opacity={0.85}
            />

            <Trace x1={88} y1={66} x2={104} y2={66} delayMs={1050} color={BLUE} sw={1.0} />
            <Trace x1={104} y1={66} x2={104} y2={80} delayMs={1220} color={BLUE} sw={1.0} />
            <Trace x1={104} y1={80} x2={130} y2={80} delayMs={1330} color={BLUE} sw={1.0} />
            <Trace x1={172} y1={66} x2={156} y2={66} delayMs={1080} color={BLUE} sw={1.0} />
            <Trace x1={156} y1={66} x2={156} y2={80} delayMs={1250} color={BLUE} sw={1.0} />

            <CircuitDot cx={88} cy={66} delayMs={1050} size={2.8} color={BLUE} />
            <CircuitDot cx={130} cy={80} delayMs={1380} size={2.8} color={LIGHT_BLUE} />
            <CircuitDot cx={172} cy={66} delayMs={1080} size={2.8} color={BLUE} />

            <ChevronDraw cx={130} cy={136} armLen={38} delayMs={1100} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.wordRow, { opacity: wordOp, transform: [{ translateY: wordY }] }]}>
          <Text style={styles.wordPharm}>Pharm</Text>
          <Text style={styles.wordLink}>Link</Text>
        </Animated.View>

        <Animated.View style={[styles.tagPill, { opacity: tagOp }]}>
          <View style={styles.tagDot} />
          <Text style={styles.tagText}>DRUG AVAILABILITY & ACCESSIBILITY</Text>
        </Animated.View>

        <Animated.View style={[styles.divider, { opacity: tagOp }]} />

        <Animated.Text style={[styles.subLine, { opacity: tagOp }]}>
          Smarter, safer medication journeys
        </Animated.Text>

        <Animated.View style={{ opacity: tagOp, width: "70%" }}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  transform: [{ translateX: -100 }, { scaleX: barScale }, { translateX: 100 }],
                },
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.dotsRow, { opacity: tagOp }]}>
          <BounceDot delay={0} />
          <BounceDot delay={150} />
          <BounceDot delay={300} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
  },
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.52,
    backgroundColor: DARK_NAVY,
    borderBottomLeftRadius: width * 0.65,
    borderBottomRightRadius: width * 0.22,
    opacity: 0.78,
  },
  bgBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.26,
    backgroundColor: "#090F2F",
    borderTopRightRadius: width * 0.52,
    opacity: 0.58,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: BLUE,
    opacity: 0.16,
  },
  card: {
    width: width * 0.84,
    maxWidth: 340,
    paddingBottom: 30,
    borderRadius: 28,
    alignItems: "center",
    borderColor: "rgba(91,156,246,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
    overflow: "hidden",
  },
  cardBar: {
    width: "100%",
    height: 3,
    marginBottom: 6,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
    marginTop: 2,
  },
  wordPharm: {
    fontSize: 34,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: -0.5,
  },
  wordLink: {
    fontSize: 34,
    fontWeight: "800",
    color: "#3B82F6",
    letterSpacing: 1,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,107,230,0.18)",
    borderWidth: 1,
    borderColor: "rgba(91,156,246,0.35)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 16,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
  },
  tagText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: LIGHT_BLUE,
    letterSpacing: 1.1,
  },
  divider: {
    width: 44,
    height: 1,
    backgroundColor: "rgba(91,156,246,0.28)",
    marginBottom: 10,
  },
  subLine: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255,255,255,0.42)",
    letterSpacing: 0.2,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  barTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(91,156,246,0.15)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    width: "100%",
    borderRadius: 2,
    backgroundColor: BLUE,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BLUE,
  },
});