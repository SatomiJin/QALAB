import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppShell } from './AppShell';
import { useAdminMenuItems } from './navigation';

// Access is restricted to admins in Phase 1 (route guard + backend RolesGuard).
export function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AppShell
      menuItems={useAdminMenuItems()}
      brandSuffix={t('app.admin')}
      headerExtra={
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/dashboard')}
        >
          {t('nav.backToApp')}
        </Button>
      }
    />
  );
}
