import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Camera, RotateCcw } from 'lucide-react-native';
import { checkOutMeetingApi, uploadVisitPhotoApi } from '../../api/endpoints';
import { Card, FormField, Header, Notice, PickerField, PrimaryButton, Screen, SecondaryButton, Stepper, ToggleRow } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { todayStr } from '../../utils/format';
import { clearVisitProgress, getVisitProgress, keepPhoto, OUTCOMES, saveVisitProgress } from '../../utils/visit';

const STEPS = ['Location', 'Scan QR', 'Selfie'];
const MAX_SIDE = 1280;

// Selfie ko ~1280px (lambi taraf) tak chhota karke JPEG. Server 5 MB tak leta hai.
async function compress(asset) {
  const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
  let context = ImageManipulator.manipulate(asset.uri);
  if (longest > MAX_SIDE) context = context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return result.uri;
}

// Visit ka kadam 3: selfie, nateeja, notes, follow-up -> photo upload + check-out (POST /:id/photo, POST /:id/check-out).
// Har badlav phone mein bhi save hota hai, taaki app band ho jaye to yahin se.
export default function VisitCompleteScreen({ navigation, route }) {
  const { meeting } = route.params;
  const { company } = useAuth();
  const photoRequired = Boolean(company?.requireVisitPhoto);
  const location = useLocation({ ask: true });
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState({ uri: null, uploaded: false });
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState({ on: false, date: '', time: '10:00' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const loaded = useRef(false);

  // Pichli baar ki adhoori haalat wapas
  useEffect(() => {
    getVisitProgress(meeting._id).then((saved) => {
      if (saved) {
        if (saved.photoUri) setPhoto({ uri: saved.photoUri, uploaded: Boolean(saved.photoUploaded) });
        if (saved.outcome) setOutcome(saved.outcome);
        if (saved.notes) setNotes(saved.notes);
        if (saved.followUp) setFollowUp(saved.followUp);
      }
      loaded.current = true;
      setReady(true);
    });
  }, [meeting._id]);

  // Badlav save (photo alag se, jab li jati hai)
  useEffect(() => {
    if (loaded.current) saveVisitProgress(meeting._id, { step: 3, outcome, notes, followUp });
  }, [meeting._id, outcome, notes, followUp]);

  const clearField = (key) => setFields((previous) => ({ ...previous, [key]: undefined }));

  const takeSelfie = async () => {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setFields((previous) => ({ ...previous, visitPhoto: 'Allow the camera in your phone settings to take the visit photo.' }));
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, mediaTypes: ['images'], quality: 1 });
    if (shot.canceled || !shot.assets?.[0]) return;
    setBusy('photo');
    try {
      const uri = keepPhoto(meeting._id, await compress(shot.assets[0]));
      setPhoto({ uri, uploaded: false });
      await saveVisitProgress(meeting._id, { photoUri: uri, photoUploaded: false });
      clearField('visitPhoto');
    } catch {
      setError('Could not save the photo. Try again.');
    } finally {
      setBusy('');
    }
  };

  const changeOutcome = (value) => {
    setOutcome(value);
    clearField('outcome');
    // Is nateeje mein agli tarikh zaroori hai (server bhi maangta hai)
    if (value === 'FOLLOW_UP_REQUIRED') setFollowUp((previous) => ({ ...previous, on: true }));
  };

  const complete = async () => {
    const problems = {};
    if (!outcome) problems.outcome = 'Choose how the meeting went.';
    if (photoRequired && !photo.uri) problems.visitPhoto = 'Take a selfie at the client site to complete the visit.';
    if (followUp.on && !followUp.date) problems['followUp.date'] = 'Choose the follow-up date.';
    setFields(problems);
    if (Object.keys(problems).length) return;

    setError('');
    const position = location.position;
    try {
      // 1. Photo (sirf ek baar; dobara koshish par chhodo)
      if (photo.uri && !photo.uploaded) {
        setBusy('upload');
        await uploadVisitPhotoApi(meeting._id, { uri: photo.uri, lat: position?.lat, lng: position?.lng });
        setPhoto((previous) => ({ ...previous, uploaded: true }));
        await saveVisitProgress(meeting._id, { photoUploaded: true });
      }
      // 2. Check-out + nateeja. Location na mile to bhi check-out hota hai (server note kar leta hai).
      setBusy('complete');
      await checkOutMeetingApi(meeting._id, {
        ...(position && { lat: position.lat, lng: position.lng, accuracy: position.accuracy }),
        result: { outcome, remarks: notes.trim() },
        followUp: followUp.on ? { date: followUp.date, time: followUp.time || undefined } : {},
      });
      await clearVisitProgress(meeting._id);
      navigation.navigate('Tabs', { screen: 'Visits' });
    } catch (err) {
      setFields(err.fields ?? {});
      if (!['visitPhoto', 'followUp.date', 'result.outcome'].some((key) => err.fields?.[key])) setError(err.message);
      setBusy('');
    }
  };

  if (!ready) return <Screen />;

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton
            title={busy === 'upload' ? 'Uploading photo…' : 'Complete visit'}
            onPress={complete}
            loading={busy === 'upload' || busy === 'complete'}
            disabled={busy === 'photo'}
          />
        </>
      }
    >
      <Header title={meeting.client || meeting.title} subtitle="You are checked in" onBack={navigation.goBack} />
      <Stepper steps={STEPS} current={2} />

      <View style={styles.group}>
        {photo.uri ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo.uri }} style={styles.image} accessibilityLabel="Selfie at client site" />
            <SecondaryButton title="Retake" icon={RotateCcw} onPress={takeSelfie} loading={busy === 'photo'} disabled={Boolean(busy)} />
          </View>
        ) : (
          <View style={[styles.photoBox, fields.visitPhoto && styles.photoBoxError]}>
            <Camera size={28} strokeWidth={1.8} color={colors.muted} />
            <Text style={text.bodySemiBold}>Selfie at client site{photoRequired ? '' : ' (optional)'}</Text>
            <SecondaryButton title="Open camera" onPress={takeSelfie} loading={busy === 'photo'} style={styles.openCamera} />
          </View>
        )}
        {fields.visitPhoto ? <Text style={styles.error}>{fields.visitPhoto}</Text> : null}
      </View>

      <View style={styles.group}>
        <Text style={text.label}>How did it go?</Text>
        <View style={styles.chips}>
          {OUTCOMES.map((option) => {
            const selected = outcome === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => changeOutcome(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {fields.outcome || fields['result.outcome'] ? <Text style={styles.error}>{fields.outcome || fields['result.outcome']}</Text> : null}
      </View>

      <FormField
        label="Meeting notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="What did you discuss? Any requirement or next step?"
        multiline
        maxLength={1000}
        editable={!busy}
      />

      <Card padded={false}>
        <ToggleRow
          title="Schedule a follow-up meeting"
          subtitle="Your admin sees it in follow-ups"
          value={followUp.on}
          onValueChange={(on) => setFollowUp((previous) => ({ ...previous, on }))}
          divider={followUp.on}
        />
        {followUp.on && (
          <View style={styles.followUp}>
            <PickerField
              label="Date"
              mode="date"
              value={followUp.date}
              min={todayStr()}
              onChange={(date) => {
                setFollowUp((previous) => ({ ...previous, date }));
                clearField('followUp.date');
              }}
              error={fields['followUp.date']}
            />
            <PickerField label="Time" mode="time" value={followUp.time} onChange={(time) => setFollowUp((previous) => ({ ...previous, time }))} />
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  photoBox: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    padding: spacing.screen,
  },
  photoBoxError: { borderColor: colors.danger },
  openCamera: { alignSelf: 'stretch' },
  preview: { gap: spacing.gap },
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.card, backgroundColor: colors.divider },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: sizes.touch,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
  },
  chipSelected: { borderColor: colors.success, backgroundColor: colors.successTint },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.successDark },
  followUp: { flexDirection: 'row', gap: spacing.gap, padding: spacing.gapLg },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});
