// SplashScreen.tsx
//
// Brand intro animation shown while the app boots. Uses the SAME
// grandma.png logo as the login screen — bounces it in with a slight
// scale spring + gentle continuous "breathing" loop, layered over a
// soft brand-tinted gradient (faked with stacked translucent layers
// since we don't ship react-native-linear-gradient).
//
// Auto-advances to the Login screen after the entrance is finished.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  useWindowDimensions,
} from 'react-native';

const ENTRY_DURATION = 1100;       // bounce-in from drop
const HOLD_AFTER_ENTRY = 900;      // breathe for a moment
const FADE_OUT_DURATION = 400;
const TOTAL_BEFORE_NAVIGATE =
  ENTRY_DURATION + HOLD_AFTER_ENTRY + FADE_OUT_DURATION;

export default function SplashScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Drives all of the entrance animations.
  const dropY      = useRef(new Animated.Value(-180)).current; // logo falls in
  const scaleSpring = useRef(new Animated.Value(0.6)).current; // bounces to 1
  const titleFade  = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const subFade    = useRef(new Animated.Value(0)).current;
  // Continuous breathing loop after the entrance lands.
  const breathe    = useRef(new Animated.Value(1)).current;
  // Fade the whole screen out before we hand off to Login.
  const overallFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1) Logo: fall in from top + spring scale.
    Animated.parallel([
      Animated.timing(dropY, {
        toValue: 0,
        duration: ENTRY_DURATION,
        easing: Easing.bezier(0.22, 1.4, 0.36, 1),  // overshoot for a bounce feel
        useNativeDriver: true,
      }),
      Animated.spring(scaleSpring, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // 2) Title + subtitle stagger after the logo lands.
    Animated.sequence([
      Animated.delay(ENTRY_DURATION * 0.55),
      Animated.parallel([
        Animated.timing(titleFade,  { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(subFade, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();

    // 3) Subtle breathing loop (very gentle scale up/down) so it doesn't sit static.
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1.00, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const breatheTimer = setTimeout(() => breatheLoop.start(), ENTRY_DURATION);

    // 4) Fade everything out, then navigate to Login.
    const navTimer = setTimeout(() => {
      Animated.timing(overallFade, {
        toValue: 0,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Login');
      });
    }, TOTAL_BEFORE_NAVIGATE - FADE_OUT_DURATION);

    return () => {
      breatheLoop.stop();
      clearTimeout(breatheTimer);
      clearTimeout(navTimer);
    };
  }, [navigation, dropY, scaleSpring, titleFade, titleSlide, subFade, breathe, overallFade]);

  const logoSize = isTablet ? 180 : 140;

  return (
    <Animated.View style={[styles.root, { opacity: overallFade }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#cbc2b4" />

      {/* Faux-gradient: stacked translucent ovals create a soft warm glow
          behind the logo without pulling in react-native-linear-gradient. */}
      <View style={[styles.glow, styles.glowOuter,  { width: width * 1.4, height: width * 1.4 }]} />
      <View style={[styles.glow, styles.glowMiddle, { width: width * 1.0, height: width * 1.0 }]} />
      <View style={[styles.glow, styles.glowInner,  { width: width * 0.7, height: width * 0.7 }]} />

      {/* Logo card */}
      <Animated.View
        style={[
          styles.logoCard,
          {
            width:  logoSize + 36,
            height: logoSize + 36,
            borderRadius: (logoSize + 36) / 2,
            transform: [
              { translateY: dropY },
              { scale: Animated.multiply(scaleSpring, breathe) },
            ],
          },
        ]}
      >
        <Image
          source={require('../styles/pictures/grandma.png')}
          style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            fontSize: isTablet ? 56 : 44,
            opacity: titleFade,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        TrayMate
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          { fontSize: isTablet ? 18 : 16, opacity: subFade },
        ]}
      >
        Every Meal Respects Every Need
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#cbc2b4', // matches Login screen base
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Faux radial gradient: three concentric ovals with brand colors at
  // decreasing opacity. Cheap, no extra dep, looks soft & warm.
  glow: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glowOuter:  { backgroundColor: '#e8dfd0', opacity: 0.55 },
  glowMiddle: { backgroundColor: '#f0e8d8', opacity: 0.55 },
  glowInner:  { backgroundColor: '#f7f0df', opacity: 0.7  },
  logoCard: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    marginBottom: 28,
  },
  title: {
    color: '#2f2f2f',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    color: '#6b6b6b',
    fontWeight: '600',
  },
});
