// Ant Design ka theme. Colors, font aur radius yahan dobara nahi likhe: variables.css se padhe jaate hain,
// taaki design system ek hi jagah (variables.css) badalne se Ant Design components aur hamari CSS dono badlein.
export function buildTheme() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(name).trim() || undefined;
  const px = (name) => Number.parseInt(read(name), 10) || undefined;

  return {
    token: {
      colorPrimary: read('--color-primary'),
      colorSuccess: read('--color-success'),
      colorWarning: read('--color-warning'),
      colorError: read('--color-danger'),
      colorInfo: read('--color-info'),
      colorTextBase: read('--color-text'),
      colorBgLayout: read('--color-bg'),
      colorBorder: read('--color-border'),
      colorBorderSecondary: read('--color-border'),
      fontFamily: read('--font-family'),
      fontSize: 14,
      borderRadius: px('--radius-sm'),
      borderRadiusLG: px('--radius-md'),
      // Buttons / inputs ki oonchai. Phone par chhote buttons ko global.css 36px tak badhata hai.
      controlHeight: 40,
      controlHeightSM: 32,
      // Halki parchhai (popups ke liye)
      boxShadowSecondary: read('--shadow-md'),
    },
    components: {
      Layout: {
        siderBg: read('--color-surface'),
        headerBg: read('--color-surface'),
        bodyBg: read('--color-bg'),
      },
      // Halka sidebar menu: active item primary ke halke rang mein
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemColor: read('--color-text-secondary'),
        itemHoverBg: read('--color-bg'),
        itemSelectedBg: read('--color-primary-light'),
        itemSelectedColor: read('--color-primary'),
        itemBorderRadius: px('--radius-sm'),
        itemMarginInline: 12,
        itemHeight: 40,
        groupTitleColor: read('--color-text-muted'),
        groupTitleFontSize: 12,
        iconSize: 16,
        collapsedIconSize: 18,
      },
      Table: {
        headerBg: read('--color-surface-muted'),
        headerColor: read('--color-text-muted'),
        headerSplitColor: 'transparent',
        rowHoverBg: read('--color-surface-muted'),
        borderColor: read('--color-border'),
      },
      Card: {
        headerFontSize: 14,
        headerFontSizeSM: 14,
      },
      Segmented: {
        trackBg: read('--color-bg'),
      },
    },
  };
}
