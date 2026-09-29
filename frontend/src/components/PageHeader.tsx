import { Typography } from 'antd';
import type { ReactNode } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  extra?: ReactNode;
}

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  useDocumentTitle(title);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description && (
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            {description}
          </Typography.Paragraph>
        )}
      </div>
      {extra}
    </header>
  );
}
