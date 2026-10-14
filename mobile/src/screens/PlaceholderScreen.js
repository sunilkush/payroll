import { Hammer } from 'lucide-react-native';
import { Card, EmptyState, Header, Screen } from '../components';

// Jo screen abhi bani nahi (agle phase mein banegi) uski jagah. Banne par screen ki file se ye hat jata hai.
//   tab    true: bottom tab wali screen (neeche ka safe area tab bar leta hai)
//   onBack / right: Header ke
export default function PlaceholderScreen({ title, subtitle, tab = false, onBack, right, children }) {
  return (
    <Screen edges={tab ? ['top'] : ['top', 'bottom']}>
      <Header title={title} subtitle={subtitle} onBack={onBack} right={right} />
      <Card>
        <EmptyState icon={Hammer} title={`${title} is coming soon`} message="This screen will be built in the next phase." />
      </Card>
      {children}
    </Screen>
  );
}
