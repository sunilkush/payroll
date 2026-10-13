import { Redirect } from 'expo-router';
import { ROLE_HOME, useAuth } from '../context/AuthContext.js';

// "/" par aane wala user apne role ke home par jaata hai.
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? ROLE_HOME[user.role] : '/login'} />;
}
