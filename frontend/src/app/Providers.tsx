import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { useState, type ReactNode } from 'react';
import { PreferencesProvider } from '../features/preferences/PreferencesProvider';
import { createQueryClient } from '../lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AntdApp>{children}</AntdApp>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
