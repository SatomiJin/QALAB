import { ArrowLeftOutlined, RightOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './PageTrail.module.scss';

export interface TrailItem {
  label: string;
  /** Omit for the current page (the last item). */
  to?: string;
}

interface PageTrailProps {
  /** Where the back button goes, and its accessible name. */
  back: { to: string; label: string };
  items: TrailItem[];
}

/**
 * Back button + breadcrumb above a page title: "Learning › Course › Lesson".
 * The last item is the current page and is not a link.
 */
export function PageTrail({ back, items }: PageTrailProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.trail}>
      <Tooltip title={back.label}>
        <Link
          to={back.to}
          className={styles.back}
          aria-label={back.label}
          data-testid="page-back"
        >
          <ArrowLeftOutlined aria-hidden />
        </Link>
      </Tooltip>
      <nav aria-label={t('trail.label')} className={styles.crumbs}>
        <ol>
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${index}-${item.label}`}>
                {item.to && !last ? (
                  <Link to={item.to}>{item.label}</Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
                {!last && (
                  <RightOutlined className={styles.separator} aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
