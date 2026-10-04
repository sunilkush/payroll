import { Tag } from 'antd';

const COLOR = { success: 'success', danger: 'error', warning: 'warning', info: 'processing', muted: 'default' };

// tone: success | danger | warning | info | muted
export default function Badge({ tone = 'muted', children }) {
  return <Tag color={COLOR[tone]}>{children}</Tag>;
}
