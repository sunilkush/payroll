import { Alert, Button, Card, Steps } from 'antd';

const STEPS = [
  { title: 'Select Cycle', key: 'cycle' },
  { title: 'Attendance Sync', key: 'attendance' },
  { title: 'Preview', key: 'preview' },
  { title: 'Finalize', key: 'finalize' },
];

export default function RunPayrollStepper({ currentStep = 0, onNext, onBack, summary }) {
  return (
    <Card className="shadow-sm">
      <Steps current={currentStep} items={STEPS} />

      {summary && (
        <Alert
          className="mt-4"
          type="info"
          message={`Net Pay: ${summary.netPay} | Employees: ${summary.employeeCount}`}
          showIcon
        />
      )}

      <div className="mt-4 flex gap-2 justify-end">
        <Button disabled={currentStep === 0} onClick={onBack}>Back</Button>
        <Button type="primary" onClick={onNext}>
          {currentStep === STEPS.length - 1 ? 'Finalize Payroll' : 'Next'}
        </Button>
      </div>
    </Card>
  );
}
