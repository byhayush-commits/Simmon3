import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Heart,
  Clock,
  Pencil,
  Check,
  Hammer,
  Info,
  Activity,
  Package,
  Shield,
  Bot,
  ArrowUpRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { Header } from '../components/common/Header';
import { StatCard } from '../components/common/StatCard';
import { ListRow } from '../components/common/ListRow';
import { FlowerMark } from '../components/common/FlowerMark';
import { Gender } from '../services/LibraryService';
import { useLibrary } from '../hooks/useLibrary';

type StackParams = {
  History: undefined;
  Playlist: { playlistId: string };
};

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

const REPO_URL = 'https://github.com/byhayush-commits/Aurix2.0';
const IG_URL = 'https://www.instagram.com/vivac_ayu';

// Hardcoded per explicit instruction -- not derived from app.json/expoConfig.
// Update these two lines manually at release time.
const APP_VERSION = '17.7.0';
const APP_BUILD = '069';

// Real installed versions, read from package.json / the native gradle file at
// the time this was written -- NewPipe Extractor's version is never guessed;
// it's the exact string pinned in modules/note-native's build.gradle.
const DEPENDENCIES: { name: string; version: string }[] = [
  { name: 'Expo', version: '57.0.22' },
  { name: 'React', version: '19.2.3' },
  { name: 'React Native', version: '0.86.3' },
  { name: 'React Navigation', version: '7.3.18' },
  { name: 'React Native Reanimated', version: '4.5.1' },
  { name: 'Expo Audio', version: '57.0.5' },
  { name: 'NewPipe Extractor', version: 'v0.26.5' },
];

/** What Jarvis watches, locally, to personalise the app. */
const JARVIS_PARAMS: { name: string; value: string }[] = [
  { name: 'Retention rate', value: 'how often you replay a track' },
  { name: 'Skip rate', value: 'how quickly you move past songs' },
  { name: 'Completion rate', value: 'tracks you hear to the end' },
  { name: 'Listening windows', value: 'your peak hours of the day' },
  { name: 'Genre affinity', value: 'artists & styles you return to' },
  { name: 'Queue depth', value: 'how long your sessions run' },
];

/** Blinking block cursor for the builder terminal card. */
const BlinkCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[styles.cursorBlock, { opacity }]} />;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<StackParams>>();
  const { profile, saveProfile, history, liked } = useLibrary();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showJarvis, setShowJarvis] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@aurix_profile_pic').then((uri) => {
      if (uri) setProfileImageUri(uri);
    });
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfileImageUri(uri);
        await AsyncStorage.setItem('@aurix_profile_pic', uri);
      }
    } catch (e) {
      console.error('Image picker error', e);
    }
  };

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed !== profile.name) saveProfile({ name: trimmed });
  }, [name, profile.name, saveProfile]);

  /** Header icon = one unambiguous save-and-exit action while editing. */
  const handleHeaderIconPress = useCallback(() => {
    if (editing) {
      commitName();
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [editing, commitName]);

  const open = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  }, []);

  const initial = (profile.name || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + SIZES.xxl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Profile"
          rightIcon={
            editing ? (
              <Check color={COLORS.accent.green} size={22} />
            ) : (
              <Pencil color={COLORS.text.primary} size={20} />
            )
          }
          onRightPress={handleHeaderIconPress}
        />

        {/* ---- identity ---- */}
        <View style={styles.identityRow}>
          <TouchableOpacity onPress={editing ? pickImage : undefined} style={styles.avatar}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
            {editing && (
              <View style={styles.cameraBadge}>
                <Pencil color="#fff" size={10} />
              </View>
            )}
          </TouchableOpacity>
          {editing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleHeaderIconPress}
              placeholder="Your name"
              placeholderTextColor={COLORS.text.muted}
              returnKeyType="done"
              maxLength={40}
              autoFocus
            />
          ) : (
            <Text style={styles.name}>{profile.name || 'No name set'}</Text>
          )}
        </View>

        {editing && (
          <>
            <View style={styles.pillRow}>
              {GENDERS.map((option) => {
                const active = profile.gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pill, active && styles.pillActive]}
                    activeOpacity={0.8}
                    onPress={() => saveProfile({ gender: option.value })}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.saveCapsule} activeOpacity={0.85} onPress={handleHeaderIconPress}>
              <Check color={COLORS.background} size={16} />
              <Text style={styles.saveCapsuleText}>Save changes</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ---- stats (original StatCard look, both tappable) ---- */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statTouchable}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Playlist', { playlistId: 'liked' })}
          >
            <StatCard icon={<Heart color={COLORS.accent.green} size={20} />} value={liked.length} label="Liked Songs" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statTouchable}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('History')}
          >
            <StatCard icon={<Clock color={COLORS.accent.green} size={20} />} value={history.length} label="Listening History" />
          </TouchableOpacity>
        </View>

        {/* ---- about ---- */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{APP_VERSION}</Text>
          </View>
          <View style={[styles.aboutRow, styles.aboutDivider]}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>{APP_BUILD}</Text>
          </View>
          <ListRow label="Source code" onPress={() => open(REPO_URL)} showDivider={false} />
        </View>

        {/* ---- development: builder opens as a signed terminal card ---- */}
        <Text style={styles.sectionLabel}>DEVELOPMENT</Text>
        <View style={styles.group}>
          <ListRow
            icon={<Hammer color={COLORS.text.primary} size={20} />}
            label="Builder"
            onPress={() => setShowBuilder((v) => !v)}
            showDivider={showBuilder}
          />
          {showBuilder && (
            <View style={styles.builderWrap}>
              <View style={styles.termCard}>
                <View style={styles.termBar}>
                  <View style={styles.termDots}>
                    <View style={[styles.termDot, { backgroundColor: COLORS.accent.green }]} />
                    <View style={[styles.termDot, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                    <View style={[styles.termDot, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
                  </View>
                  <Text style={styles.termTitle} numberOfLines={1}>builder@aurix — profile.tsx</Text>
                  <FlowerMark size={18} dot />
                </View>

                <View style={styles.termBody}>
                  <Text style={styles.termLine}>
                    <Text style={styles.tokKeyword}>const</Text>
                    <Text style={styles.tokPlain}> builder</Text>
                    <Text style={styles.tokMuted}> = </Text>
                    <Text style={styles.tokPlain}>{'{'}</Text>
                  </Text>
                  <Text style={styles.termLine}>
                    <Text style={styles.tokMuted}>{'  '}name: </Text>
                    <Text style={styles.tokString}>'Ayush'</Text>
                    <Text style={styles.tokMuted}>,</Text>
                  </Text>
                  <Text style={styles.termLine}>
                    <Text style={styles.tokMuted}>{'  '}instagram: </Text>
                    <Text style={styles.tokString}>'@vivac_ayu'</Text>
                    <Text style={styles.tokMuted}>,</Text>
                  </Text>
                  <View style={styles.termLastLine}>
                    <Text style={styles.termLine}>
                      <Text style={styles.tokPlain}>{'};'}</Text>
                    </Text>
                    <BlinkCursor />
                  </View>
                </View>

                <TouchableOpacity style={styles.followPill} activeOpacity={0.85} onPress={() => open(IG_URL)}>
                  <Text style={styles.followPillText}>Tap to Follow</Text>
                  <ArrowUpRight color={COLORS.background} size={16} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ---- technical ---- */}
        <Text style={styles.sectionLabel}>TECHNICAL</Text>
        <View style={styles.group}>
          <ListRow
            icon={<Info color={COLORS.text.primary} size={20} />}
            label="System Information"
            onPress={() => setShowSystemInfo((v) => !v)}
            showDivider={showSystemInfo}
          />
          {showSystemInfo && (
            <View style={styles.infoBlock}>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Platform</Text>
                <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'} {Platform.Version}</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>App version</Text>
                <Text style={styles.infoValue}>{APP_VERSION} ({APP_BUILD})</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>JS engine</Text>
                <Text style={styles.infoValue}>Hermes</Text>
              </View>
            </View>
          )}

          <ListRow
            icon={<Activity color={COLORS.text.primary} size={20} />}
            label="Diagnostics"
            onPress={() => setShowDiagnostics((v) => !v)}
            showDivider={showDiagnostics}
          />
          {showDiagnostics && (
            <View style={styles.infoBlock}>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Audio engine</Text>
                <Text style={styles.infoValue}>expo-audio</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Stream extraction</Text>
                <Text style={styles.infoValue}>NewPipe Extractor v0.26.5</Text>
              </View>
              <View style={styles.infoLine}>
                <Text style={styles.infoKey}>Native module</Text>
                <Text style={styles.infoValue}>note-native</Text>
              </View>
            </View>
          )}

          <ListRow
            icon={<Package color={COLORS.text.primary} size={20} />}
            label="Open Source Libraries"
            onPress={() => setShowDependencies((v) => !v)}
            showDivider={showDependencies}
          />
          {showDependencies && (
            <View style={styles.infoBlock}>
              {DEPENDENCIES.map((dep) => (
                <View key={dep.name} style={styles.infoLine}>
                  <Text style={styles.infoKey}>{dep.name}</Text>
                  <Text style={styles.infoValue}>{dep.version}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---- data use (above the last group) ---- */}
        <Text style={styles.sectionLabel}>DATA USE</Text>
        <View style={styles.group}>
          <ListRow
            icon={<Shield color={COLORS.text.primary} size={20} />}
            label="Privacy Policy"
            onPress={() => setShowPrivacy((v) => !v)}
            showDivider={showPrivacy}
          />
          {showPrivacy && (
            <View style={styles.infoBlock}>
              <Text style={styles.policyText}>
                Aurix collects nothing. There are no accounts, no analytics, no telemetry and
                no servers — everything you do stays on this device.
                {'\n\n'}
                The only details you ever enter are your name, age and gender, and they exist
                purely to personalise your local profile. They never leave your phone.
                {'\n\n'}
                Your library, likes, history and queue live in local storage and are erased
                the moment you uninstall the app. What you listen to is nobody's business —
                not even ours.
              </Text>
            </View>
          )}

          <ListRow
            icon={<Bot color={COLORS.text.primary} size={20} />}
            label="Jarvis"
            onPress={() => setShowJarvis((v) => !v)}
            showDivider={showJarvis}
          />
          {showJarvis && (
            <View style={styles.infoBlock}>
              <Text style={styles.policyText}>
                Jarvis is the on-device engine that learns how you listen and shapes your
                Home shelves and recommendations. It studies these parameters across your
                songs — computed locally, never uploaded:
              </Text>
              {JARVIS_PARAMS.map((param) => (
                <View key={param.name} style={styles.infoLine}>
                  <Text style={styles.infoKey}>{param.name}</Text>
                  <Text style={styles.infoValue}>{param.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ---- support ---- */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.group}>
          <ListRow label="Help & Support" onPress={() => open(REPO_URL + '/issues')} />
          <ListRow label="Report a Bug" onPress={() => open(REPO_URL + '/issues/new')} showDivider={false} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 32 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  avatarInitial: { fontFamily: FONTS.extrabold, fontSize: 26, color: COLORS.text.primary },
  name: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text.primary },
  nameInput: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text.primary,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radius.pill,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  pill: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius.pill,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surfaceLight,
  },
  pillActive: { backgroundColor: COLORS.accent.green, borderColor: COLORS.accent.green },
  pillText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text.secondary },
  pillTextActive: { color: COLORS.text.primary },
  saveCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.accent.green,
    borderRadius: SIZES.radius.pill,
    paddingVertical: SIZES.sm + 2,
  },
  saveCapsuleText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.background },

  statsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.xl,
  },
  statTouchable: { flex: 1 },

  /* Labels sit at 32dp so they line up with the content inside the cards. */
  sectionLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.text.muted,
    marginBottom: SIZES.sm,
    marginLeft: SIZES.xl,
    marginRight: SIZES.md,
  },
  group: {
    marginHorizontal: SIZES.md,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: SIZES.radius.lg,
    marginBottom: SIZES.xl,
    overflow: 'hidden',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  aboutDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline },
  aboutLabel: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text.secondary },
  aboutValue: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text.primary },

  /* ---- builder terminal card ---- */
  builderWrap: {
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.smd,
    paddingBottom: SIZES.md,
  },
  termCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
  },
  termBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingBottom: SIZES.sm,
    marginBottom: SIZES.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  termDots: { flexDirection: 'row', gap: 5 },
  termDot: { width: 8, height: 8, borderRadius: 4 },
  termTitle: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.text.muted,
    letterSpacing: 0.5,
  },
  termBody: { marginBottom: SIZES.lg },
  termLine: {
    fontFamily: 'monospace',
    fontSize: 13.5,
    lineHeight: 22,
  },
  termLastLine: { flexDirection: 'row', alignItems: 'center' },
  cursorBlock: {
    width: 8,
    height: 15,
    backgroundColor: COLORS.accent.green,
    marginLeft: 6,
    borderRadius: 1.5,
  },
  tokKeyword: { color: COLORS.accent.green },
  tokPlain: { color: COLORS.text.primary },
  tokMuted: { color: COLORS.text.muted },
  tokString: { color: '#FF9DB1' },
  followPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    borderRadius: SIZES.radius.pill,
    backgroundColor: COLORS.accent.green,
    paddingVertical: SIZES.sm + 2,
  },
  followPillText: { fontFamily: FONTS.semibold, fontSize: 14, color: COLORS.background },

  infoBlock: {
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.xs,
    paddingBottom: SIZES.smd,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoKey: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text.secondary, paddingRight: SIZES.md },
  infoValue: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text.primary, flexShrink: 1, textAlign: 'right' },
  policyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text.secondary,
    marginBottom: SIZES.sm,
  },
});
