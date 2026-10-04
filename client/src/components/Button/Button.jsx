import { Button as AntButton } from 'antd';

// Ant Design Button par hamara chhota sa wrapper, taaki pages mein ek hi tareeke se likha jaye.
// variant: primary | secondary | danger     size: md | sm     type: button | submit
export default function Button({ variant = 'primary', size = 'md', type = 'button', ...props }) {
  return (
    <AntButton
      type={variant === 'primary' ? 'primary' : 'default'}
      danger={variant === 'danger'}
      size={size === 'sm' ? 'small' : 'middle'}
      htmlType={type}
      {...props}
    />
  );
}
