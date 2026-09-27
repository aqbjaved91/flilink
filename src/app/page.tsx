// Starting screen: log in (with a link to sign up). Signed-in creators are
// sent to the dashboard by the proxy.
import { AuthScreen } from '@/components/auth/AuthScreen';

export default function HomePage() {
  return <AuthScreen defaultMode="login" />;
}
