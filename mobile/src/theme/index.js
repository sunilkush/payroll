// Design system: rang, font, golai aur doori. Screens mein koi rang / font seedha na likho, yahin se lo.

export const colors = {
  paper: '#F3F1EC', // screen ka background
  card: '#FFFFFF',
  ink: '#15171C', // text, dark cards, primary buttons
  muted: '#5A5F6B',
  line: '#E2DED6',
  divider: '#ECE9E2',
  inputBorder: '#D6D2C9',
  track: '#E6E3DC', // SegmentedControl / ProgressBar ki patti

  success: '#0A6B50',
  successTint: '#E3F1EB',
  successDark: '#064A37',
  successBright: '#3FBF8F', // dark card par

  warning: '#8A4B06',
  warningTint: '#FBEEDB',

  danger: '#A3231A',
  dangerTint: '#FBE5E2',

  info: '#1D3F8C',
  infoTint: '#D9E3F7',

  neutral: '#3A3E47',
  neutralTint: '#ECEAE4',

  onInk: '#FFFFFF',
  onInkMuted: '#A9ADB8',
};

// App.js mein isi naam se load hote hain (@expo-google-fonts).
export const fonts = {
  heading: 'BricolageGrotesque_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
  // Saare time, paise, ginti aur duration mono mein
  mono: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
};

export const radius = { card: 16, hero: 20, input: 12, button: 14, pill: 999 };

export const spacing = { screen: 20, gap: 12, gapLg: 16 };

export const sizes = { touch: 44, input: 50, button: 56 };

export const text = {
  screenTitle: { fontFamily: fonts.heading, fontSize: 25, lineHeight: 30, color: colors.ink },
  heading: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodySemiBold: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18, color: colors.ink },
  pill: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 22, color: colors.ink },
  monoLarge: { fontFamily: fonts.monoSemiBold, fontSize: 24, lineHeight: 30, color: colors.ink },
};

// Attendance calendar ke din ka rang (status se). Aaj ka din ink (kaala) hota hai.
export const calendarColors = {
  PRESENT: '#CDE8DC',
  HALF_DAY: '#F6DDB5',
  LEAVE: '#D9E3F7',
  HOLIDAY: '#ECEAE4',
  WEEK_OFF: '#ECEAE4',
  ABSENT: colors.dangerTint,
};

// Pill ke rang. variant: success | warning | danger | info | neutral
export const pillColors = {
  success: { background: colors.successTint, text: colors.successDark },
  warning: { background: colors.warningTint, text: colors.warning },
  danger: { background: colors.dangerTint, text: colors.danger },
  info: { background: colors.infoTint, text: colors.info },
  neutral: { background: colors.neutralTint, text: colors.neutral },
  ink: { background: colors.ink, text: colors.onInk },
};
