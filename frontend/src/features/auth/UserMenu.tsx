import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, type MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from './auth-context';
import styles from './UserMenu.module.scss';

function initials(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)!] : [parts[0]];
  return letters.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, isAdmin, signOut } = useAuth();

  const items: MenuProps['items'] = [
    {
      key: 'who',
      disabled: true,
      label: (
        <div className={styles.who}>
          <strong>{profile?.displayName}</strong>
          <span>{profile?.email}</span>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'profile', icon: <UserOutlined />, label: t('userMenu.profile') },
    ...(isAdmin
      ? [
          {
            key: 'admin',
            icon: <SettingOutlined />,
            label: t('userMenu.admin'),
          },
        ]
      : []),
    { type: 'divider' },
    { key: 'signOut', icon: <LogoutOutlined />, label: t('userMenu.signOut') },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'admin') navigate('/admin');
    // RequireAuth sends the signed-out user to the login page.
    if (key === 'signOut') void signOut();
  };

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, onClick }}
      placement="bottomRight"
    >
      <Button
        type="text"
        className={styles.trigger}
        aria-label={t('userMenu.label')}
        data-testid="user-menu"
      >
        <Avatar
          size={28}
          className={styles.avatar}
          icon={!profile && <UserOutlined />}
        >
          {initials(profile?.displayName)}
        </Avatar>
      </Button>
    </Dropdown>
  );
}
