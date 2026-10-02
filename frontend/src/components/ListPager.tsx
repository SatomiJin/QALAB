import { ConfigProvider, Grid, Pagination, Select } from 'antd';
import { PAGE_SIZES, type PageSize } from '../types/api';
import styles from './ListPager.module.scss';

// Phones: 40px page buttons and select, easier to hit with a thumb.
const TOUCH_THEME = {
  components: {
    Pagination: { itemSize: 40 },
    Select: { controlHeight: 40 },
  },
};

interface ListPagerProps {
  page: number;
  pageSize: PageSize;
  total: number;
  /** Items shown on this page. */
  count: number;
  /** "1–20 of 46 courses". */
  rangeLabel: (range: { start: number; end: number; total: number }) => string;
  sizeLabel: string;
  optionLabel: (size: PageSize) => string;
  onChange: (next: { page: number; pageSize: PageSize }) => void;
  rangeTestId?: string;
}

/**
 * Pager under a paginated list: tabular range on the left, our own page-size
 * select and Ant Design's pager on the right. The select is ours because Ant
 * Design hides its size changer on small screens.
 */
export function ListPager({
  page,
  pageSize,
  total,
  count,
  rangeLabel,
  sizeLabel,
  optionLabel,
  onChange,
  rangeTestId,
}: ListPagerProps) {
  const screens = Grid.useBreakpoint();
  const start = (page - 1) * pageSize + 1;
  const end = start + count - 1;

  return (
    <ConfigProvider theme={screens.md === false ? TOUCH_THEME : undefined}>
      <div className={styles.pager}>
        <span className={styles.range} data-testid={rangeTestId}>
          {rangeLabel({
            start: Math.min(start, total),
            end: Math.max(end, 0),
            total,
          })}
        </span>
        <div className={styles.controls}>
          <Select<PageSize>
            value={pageSize}
            aria-label={sizeLabel}
            data-testid="page-size"
            options={PAGE_SIZES.map((size) => ({
              value: size,
              label: optionLabel(size),
            }))}
            // A new page size starts again from the first page.
            onChange={(nextSize) => onChange({ page: 1, pageSize: nextSize })}
          />
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger={false}
            onChange={(nextPage) => onChange({ page: nextPage, pageSize })}
          />
        </div>
      </div>
    </ConfigProvider>
  );
}
