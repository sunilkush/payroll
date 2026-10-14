import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { getSettingsApi, updateSettingsApi } from '../api/endpoints';

// Admin ki company settings (GET /settings) aur ek hissa save (PUT /settings, sirf badla hua hissa).
// Return: { company, error, loading, reload, save(payload) -> company }
export function useCompanySettings() {
  const [state, setState] = useState({ company: null, error: '', loading: true });

  const reload = useCallback(async () => {
    try {
      const res = await getSettingsApi();
      setState({ company: res.data.company, error: '', loading: false });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (payload) => {
    const res = await updateSettingsApi(payload);
    setState({ company: res.data.company, error: '', loading: false });
    return res.data.company;
  }, []);

  return { ...state, reload, save };
}

// Bina save kiye wapas jaane par "pakka?" (back button, gesture, Android back).
export function useUnsavedGuard(dirty) {
  const navigation = useNavigation();
  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard changes?', 'You have changes that are not saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
}
