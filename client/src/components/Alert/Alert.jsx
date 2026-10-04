import { Alert as AntAlert } from 'antd';
import './Alert.css';

// type: error | success. children khali ho to kuch nahi dikhta.
export default function Alert({ type = 'error', children }) {
  if (!children) return null;
  return <AntAlert className="alert" type={type} title={children} showIcon role={type === 'error' ? 'alert' : 'status'} />;
}
