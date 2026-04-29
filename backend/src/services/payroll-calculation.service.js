export const calculatePayrollItem = ({ salaryStructure, attendance, deductions = 0 }) => {
  const earnings = (salaryStructure?.earnings || []).reduce((a,c)=>a + Number(c.amount||0),0);
  const overtime = Number(attendance?.overtimeAmount || 0);
  const grossSalary = earnings + overtime;
  const leavePenalty = Number(attendance?.leavePenalty || 0);
  const totalDeductions = deductions + leavePenalty;
  const netSalary = grossSalary - totalDeductions;
  return { grossSalary, totalDeductions, netSalary, employerContribution: Number(salaryStructure?.employerContribution || 0) };
};
