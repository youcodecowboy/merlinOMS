import { ClearTestDataButton } from '../components/ClearTestDataButton';

export const TestEnvironment = () => {
  const refreshData = () => {
    // Implement your data refresh logic here
  };

  return (
    <div>
      <ClearTestDataButton onClearComplete={refreshData} />
    </div>
  );
}; 