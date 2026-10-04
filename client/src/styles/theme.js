// Ant Design ka theme. Colors aur font yahan dobara nahi likhe: variables.css se padhe jaate hain,
// taaki rang ek hi jagah (variables.css) badalne se Ant Design components aur hamari CSS dono badlein.
export function buildTheme() {
  const css = getComputedStyle(document.documentElement);
  const read = (name) => css.getPropertyValue(name).trim() || undefined;

  return {
    token: {
      colorPrimary: read('--color-primary'),
      colorSuccess: read('--color-success'),
      colorWarning: read('--color-warning'),
      colorError: read('--color-danger'),
      colorTextBase: read('--color-text'),
      colorBgLayout: read('--color-bg'),
      fontFamily: read('--font-family'),
      // 16px se chhota input font ho to iOS focus par zoom kar deta hai
      fontSize: 16,
      borderRadius: 6,
      // Ungli se dabane layak size (Rule 10): buttons, inputs, selects sab par lagta hai
      controlHeight: 44,
      controlHeightSM: 36,
    },
    components: {
      Layout: {
        siderBg: read('--color-navy'),
        headerBg: read('--color-surface'),
      },
      // Gehre sidebar ka menu: background sidebar ka hi dikhe, active item primary rang ka
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemColor: read('--color-on-dark-muted'),
        darkItemHoverBg: read('--color-glass'),
        darkItemHoverColor: read('--color-text-inverse'),
        darkItemSelectedBg: read('--color-primary'),
        darkItemSelectedColor: read('--color-text-inverse'),
        itemBorderRadius: 10,
        itemMarginInline: 12,
        itemHeight: 44,
      },
    },
  };
}
