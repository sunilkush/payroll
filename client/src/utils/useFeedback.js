import { useMemo } from 'react';
import { App } from 'antd';

// Saare pages ke liye ek hi tareeka:
//   toast.success('Saved.') / toast.error(message)   upar chhota sa message jo khud chala jata hai
//   await confirm({ title, content, okText, danger }) Ant Design ka "pakka?" popup; true = haan
// (Browser ke window.confirm / alert ki jagah.)
export function useFeedback() {
  const { message, modal } = App.useApp();

  return useMemo(
    () => ({
      toast: message,
      confirm: ({ title, content, okText = 'Yes', cancelText = 'Cancel', danger = false }) =>
        new Promise((resolve) => {
          modal.confirm({
            title,
            content,
            okText,
            cancelText,
            okButtonProps: { danger },
            centered: true,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        }),
    }),
    [message, modal]
  );
}
