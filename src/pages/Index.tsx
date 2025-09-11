import { AuthGuard } from '@/components/AuthGuard';
import RoadmapApp from './RoadmapApp';

const Index = () => {
  return (
    <AuthGuard>
      <RoadmapApp />
    </AuthGuard>
  );
};

export default Index;
