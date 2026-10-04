import { Modal as AntModal } from 'antd';

// Pages ise tabhi render karte hain jab dikhana ho ({open && <Modal>}), isliye yahan hamesha open hai.
// Buttons page khud andar rakhta hai (footer nahi). Chhoti screen par Ant Design ise apne aap
// screen ki chaudai mein fit kar deta hai aur peeche ka page scroll hone se rokta hai.
export default function Modal({ title, onClose, children }) {
  return (
    <AntModal open title={title} onCancel={onClose} footer={null} width={520} destroyOnHidden>
      {children}
    </AntModal>
  );
}
