import { LockOutlined } from '@ant-design/icons';
import { Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, ROLE_HOME } from '../utils/roles.js';

// Jo page company ke plan mein nahi hai (jaise Free par Payroll) use seedhe URL se kholne par khali page ki jagah
// saaf message: kya band hai, kaun sa plan chahiye, aur aage kya karna hai.
//   flag  company ka wo flag jo ON hona chahiye (payrollEnabled, correctionsEnabled)
//   name  feature ka naam, plan  kam se kam kaun sa plan
// Ye sirf UI hai; asli rok server par hai (requireFeature).
export default function PlanGate({ flag, name, plan, children }) {
  const { user, company } = useAuth();
  const navigate = useNavigate();

  // Super Admin (company null) kisi plan mein nahi bandha.
  if (!company || company[flag]) return children;

  const isAdmin = user.role === ROLES.ADMIN;
  return (
    <Result
      icon={<LockOutlined />}
      title={`${name} is not in your plan`}
      subTitle={
        isAdmin
          ? `${name} is available on the ${plan} plan and above. Upgrade your plan to start using it.`
          : `${name} is not turned on for your company. Please ask your admin.`
      }
      extra={
        isAdmin ? (
          <Button onClick={() => navigate('/admin/billing')}>See Plans &amp; Upgrade</Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate(ROLE_HOME[user.role])}>
            Back to Dashboard
          </Button>
        )
      }
    />
  );
}
