import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Checkbox,
  Divider,
  Row,
  Col,
  Tag,
} from "antd";
import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../slices/auth.slice";
import { Link, useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left */}
      <aside className="hidden lg:flex lg:w-1/2 min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-slate-950 p-8 xl:p-12 text-white flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <SafetyCertificateOutlined className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold m-0">SalaryPro</h2>
              <p className="text-white/70 m-0">Payroll SaaS Platform</p>
            </div>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-5">
            Smart payroll for modern businesses.
          </h1>

          <p className="text-base xl:text-lg text-white/75 max-w-xl">
            Manage employees, salary structures, payroll runs, payslips,
            approvals, PF, ESI, TDS and reports from one secure dashboard.
          </p>

          <div className="mt-10 space-y-4">
            {[
              "Automated payroll calculation",
              "Payslip PDF & email support",
              "Approval workflow with audit logs",
              "Employee self-service portal",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircleOutlined className="text-green-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/10 border border-white/15 p-6">
          <p className="text-white/80 mb-3">
            “Run payroll faster with fewer mistakes.”
          </p>
          <div className="flex flex-wrap gap-2">
            <Tag color="blue">PF</Tag>
            <Tag color="green">ESI</Tag>
            <Tag color="gold">TDS</Tag>
            <Tag color="purple">Payslip</Tag>
          </div>
        </div>
      </aside>

      {/* Right */}
      <main className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <div className="w-full max-w-[460px]">
          <div className="lg:hidden text-center mb-6">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <SafetyCertificateOutlined className="text-2xl" />
            </div>
            <Title level={3} className="!mb-0">
              SalaryPro
            </Title>
            <Text type="secondary">Payroll SaaS Platform</Text>
          </div>

          <Card
            className="w-full rounded-3xl shadow-xl border-0"
            styles={{
              body: {
                padding: "clamp(20px, 5vw, 32px)",
              },
            }}
          >
            <div className="mb-6">
              <Title level={2} className="!mb-2 !text-2xl sm:!text-3xl">
                {title}
              </Title>
              <Text type="secondary">{subtitle}</Text>
            </div>

            {children}
          </Card>

          <p className="text-center text-slate-500 mt-5 text-xs sm:text-sm">
            © {new Date().getFullYear()} SalaryPro. Secure payroll management.
          </p>
        </div>
      </main>
    </div>
  );
};

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector((s) => s.auth.loading);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage payroll and payslips."
    >
      <Form
        layout="vertical"
        size="large"
        requiredMark={false}
        onFinish={async (values) => {
          const result = await dispatch(login(values));
          if (!result.error) navigate("/app/dashboard");
        }}
      >
        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            { required: true, message: "Please enter email address" },
            { type: "email", message: "Please enter valid email" },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="Enter your email"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter password" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </Form.Item>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <Checkbox>Remember me</Checkbox>
          <Link to="/forgot-password" className="text-blue-600 font-medium">
            Forgot password?
          </Link>
        </div>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          className="!h-12 !rounded-xl !font-semibold"
        >
          Sign in <ArrowRightOutlined />
        </Button>

        <Divider plain>New to SalaryPro?</Divider>

        <Link to="/signup">
          <Button block className="!h-11 !rounded-xl">
            Create company account
          </Button>
        </Link>
      </Form>
    </AuthLayout>
  );
}

export const SignupPage = () => (
  <AuthLayout
    title="Create your company"
    subtitle="Start your payroll account in a few simple steps."
  >
    <Form layout="vertical" size="large" requiredMark={false}>
      <Form.Item
        label="Company Name"
        name="companyName"
        rules={[{ required: true, message: "Please enter company name" }]}
      >
        <Input placeholder="Example: Acme Pvt Ltd" />
      </Form.Item>

      <Form.Item
        label="Owner Name"
        name="name"
        rules={[{ required: true, message: "Please enter owner name" }]}
      >
        <Input placeholder="Enter owner name" />
      </Form.Item>

      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          { required: true, message: "Please enter email" },
          { type: "email", message: "Please enter valid email" },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="Enter email" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: "Please enter password" }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Create password" />
      </Form.Item>

      <Button type="primary" block className="!h-12 !rounded-xl !font-semibold">
        Start Free Trial
      </Button>

      <p className="text-center mt-5 mb-0 text-sm">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </Form>
  </AuthLayout>
);

export const ForgotPasswordPage = () => (
  <AuthLayout
    title="Forgot password?"
    subtitle="Enter your email and we will send reset instructions."
  >
    <Form layout="vertical" size="large" requiredMark={false}>
      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          { required: true, message: "Please enter email" },
          { type: "email", message: "Please enter valid email" },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="Enter your email" />
      </Form.Item>

      <Button type="primary" block className="!h-12 !rounded-xl !font-semibold">
        Send Reset Link
      </Button>

      <p className="text-center mt-5 mb-0 text-sm">
        Back to <Link to="/login">Login</Link>
      </p>
    </Form>
  </AuthLayout>
);

export const ResetPasswordPage = () => (
  <AuthLayout
    title="Reset password"
    subtitle="Create a strong new password."
  >
    <Form layout="vertical" size="large" requiredMark={false}>
      <Form.Item
        label="New Password"
        name="password"
        rules={[{ required: true, message: "Please enter new password" }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="New password" />
      </Form.Item>

      <Form.Item
        label="Confirm Password"
        name="confirmPassword"
        dependencies={["password"]}
        rules={[
          { required: true, message: "Please confirm password" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Passwords do not match"));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" />
      </Form.Item>

      <Button type="primary" block className="!h-12 !rounded-xl !font-semibold">
        Reset Password
      </Button>
    </Form>
  </AuthLayout>
);

export const LandingPage = () => (
  <div className="min-h-screen bg-slate-50 overflow-x-hidden">
    <header className="px-4 sm:px-6 lg:px-16 py-4 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-20 border-b border-slate-200">
      <Link to="/" className="flex items-center gap-3 text-slate-900">
        <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
          <SafetyCertificateOutlined />
        </div>
        <b className="text-lg sm:text-xl">SalaryPro</b>
      </Link>

      <div className="hidden sm:flex gap-3">
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/signup">
          <Button type="primary">Start Free Trial</Button>
        </Link>
      </div>

      <div className="sm:hidden">
        <Link to="/login">
          <Button icon={<MenuOutlined />} />
        </Link>
      </div>
    </header>

    <section className="px-4 sm:px-6 lg:px-16 py-12 sm:py-16 lg:py-20">
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} lg={12}>
          <Tag color="blue" className="mb-5">
            Payroll SaaS for modern companies
          </Tag>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            Run payroll faster, smarter and securely.
          </h1>

          <Paragraph className="text-base sm:text-lg text-slate-600 mt-5 max-w-xl">
            Complete payroll platform for employees, salary structures, payroll
            runs, approvals, payslips, PF, ESI, TDS and reports.
          </Paragraph>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link to="/signup">
              <Button type="primary" size="large" block className="sm:!w-auto">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="large" block className="sm:!w-auto">
                View Pricing
              </Button>
            </Link>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="rounded-3xl shadow-xl border-0">
            <Row gutter={[14, 14]}>
              {[
                ["Employees", "1,248"],
                ["Payroll Cost", "₹48.5L"],
                ["Payslips", "1,180"],
                ["Approvals", "12"],
              ].map(([label, value]) => (
                <Col xs={24} sm={12} key={label}>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-slate-500 mb-1">{label}</p>
                    <h2 className="text-2xl font-bold m-0">{value}</h2>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </section>
  </div>
);

export const PricingPage = () => (
  <div className="min-h-screen bg-slate-50 px-4 sm:px-6 lg:px-16 py-10 sm:py-14 overflow-x-hidden">
    <div className="text-center mb-10 sm:mb-12">
      <Title className="!text-3xl sm:!text-4xl">
        Simple pricing for every business
      </Title>
      <Text type="secondary">
        Choose a plan based on your employee count and payroll needs.
      </Text>
    </div>

    <Row gutter={[20, 20]} justify="center">
      {[
        {
          name: "Basic",
          price: "₹999",
          desc: "For small teams",
          features: ["Employee Management", "Payroll Run", "Payslip PDF"],
        },
        {
          name: "Pro",
          price: "₹2,499",
          desc: "For growing companies",
          features: ["Everything in Basic", "PF/ESI/TDS", "Approval Workflow"],
        },
        {
          name: "Enterprise",
          price: "Custom",
          desc: "For large organizations",
          features: ["Custom Limits", "Advanced Reports", "Priority Support"],
        },
      ].map((plan) => (
        <Col xs={24} sm={12} lg={8} key={plan.name}>
          <Card className="rounded-3xl shadow-sm h-full border-0">
            <Title level={3}>{plan.name}</Title>
            <Text type="secondary">{plan.desc}</Text>

            <h1 className="my-6 text-3xl sm:text-4xl">{plan.price}</h1>

            <div className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <div key={feature} className="flex gap-2">
                  <CheckCircleOutlined className="text-green-600 mt-1" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button type="primary" block className="!h-11 !rounded-xl">
              Choose Plan
            </Button>
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);