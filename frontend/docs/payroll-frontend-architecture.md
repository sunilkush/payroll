# Payroll Management Frontend Architecture (React + Redux Toolkit)

## 1) Scalable Folder Structure (Feature-first)

```txt
frontend/src/
  app/
    store.js
    providers/
      AppProviders.jsx
  api/
    baseApi.js
    endpoints/
      auth.api.js
      employee.api.js
      payroll.api.js
      salary.api.js
      attendance.api.js
      payslip.api.js
      report.api.js
  layouts/
    AdminLayout.jsx
    EmployeeLayout.jsx
    PublicLayout.jsx
  routes/
    AppRouter.jsx
    ProtectedRoute.jsx
    RoleRoute.jsx
  features/
    common/
      components/
        DataTable.jsx
        AppModal.jsx
        FormField.jsx
        Badge.jsx
        Loader.jsx
        RoleGate.jsx
    auth/
      authSlice.js
      hooks.js
      pages/LoginPage.jsx
    employees/
      employeeSlice.js
      pages/EmployeeListPage.jsx
      components/EmployeeForm.jsx
      components/EmployeeFilters.jsx
    payroll/
      payrollSlice.js
      pages/RunPayrollPage.jsx
      components/RunPayrollStepper.jsx
      components/PayrollTable.jsx
      components/PayrollSummaryCard.jsx
    salary/
      salarySlice.js
      pages/SalaryStructurePage.jsx
      components/SalaryComponentForm.jsx
      components/StructurePreview.jsx
    attendance/
      attendanceSlice.js
      pages/AttendanceSyncPage.jsx
      components/AttendanceImportPanel.jsx
    payslips/
      payslipSlice.js
      pages/PayslipListPage.jsx
      components/PayslipViewer.jsx
      components/PayslipDownloadButton.jsx
    reports/
      reportSlice.js
      pages/ReportsDashboardPage.jsx
      components/KpiCards.jsx
      components/PayrollTrendChart.jsx
  theme/
    tokens.css
  utils/
    currency.js
    date.js
```

---

## 2) Component Breakdown

### Shared/Common Components
- `DataTable`: server-side pagination, sorting, row selection.
- `AppModal`: reusable CRUD modal.
- `FormField`: wrapper for Ant `Form.Item` with validation defaults.
- `Badge`: semantic statuses (Draft/Processed/Finalized).
- `Loader`: full page and section loaders.

### Employee Components
- Employee list + quick filters (department/status/location)
- Add/Edit drawer form
- Employee profile tabs (salary, attendance, documents)

### Payroll Components
- `RunPayrollStepper` (Select Cycle → Attendance Sync → Preview → Finalize)
- `PayrollTable` for gross, deductions, net pay
- `PayrollSummaryCard` with variance vs previous cycle

### Salary Structure Components
- Earnings/Deductions builders
- Effective date based versioning UI
- Structure preview with CTC breakup

### Payslip Components
- Payslip list with month/year filters
- PDF preview drawer
- Download/share actions

### Reports Components
- KPI cards (Payroll Cost, Overtime Cost, Headcount)
- Trend charts and department-wise cost analysis
- Export controls (CSV/XLSX)

---

## 3) UI/UX Flows

### Employee Management Flow
1. Employee List with search/filter + quick stats.
2. Create/Edit via drawer (keeps context).
3. Save → optimistic row update + toast.
4. Profile page for detailed salary/attendance links.

### Payroll Processing Flow (stepper)
1. Select month + group (all/dept).
2. Sync attendance and flag anomalies.
3. Preview payroll and validate deductions.
4. Finalize with confirmation modal and audit note.

### Payslip Flow
1. Employee opens "My Payslips".
2. Filter by financial year/month.
3. View inline preview.
4. Download PDF or email from action menu.

### Dashboard Experience
- Top summary row + trend chart + alerts panel (pending approvals, failed bank transfers).
- Drill-down links from every card to filtered pages.

---

## 4) Layout System

- **AdminLayout**: sidebar, global search, notifications, command bar.
- **EmployeeLayout**: simplified nav (My Payslips, Tax, Profile).
- **Responsive**:
  - Desktop: fixed sidebar + full tables.
  - Tablet: collapsible sidebar, stacked filters.
  - Mobile: card-based lists, bottom action bar for key actions.

---

## 5) Role-Based UI + Conditional Rendering

```jsx
import RoleGate from '@/features/common/components/RoleGate';

<RoleGate role={auth.role} allowedRoles={['admin', 'hr']}>
  <RunPayrollStepper />
</RoleGate>

<RoleGate role={auth.role} allowedRoles={['employee']}>
  <PayslipViewer />
</RoleGate>
```

Access model:
- **Admin**: full modules + settings + approvals.
- **HR**: employee + payroll + salary + reports (no platform settings).
- **Employee**: payslips and tax declarations only.

---

## 6) Redux State Management Plan

Mandatory slices:
- `authSlice`: user, role, permissions, token status.
- `employeeSlice`: list, filters, pagination, selectedEmployee.
- `payrollSlice`: activeCycle, runState, previewData, finalizeStatus.
- `salarySlice`: components catalog + structures + versions.
- `attendanceSlice`: import status, anomalies, mapped records.

Conventions:
- Keep UI state local unless shared.
- Normalize entities where list sizes grow.
- Use selectors per feature.

---

## 7) API Integration Strategy (RTK Query recommended)

Suggested endpoints:
- `GET /employees`, `POST /employees`, `PATCH /employees/:id`
- `POST /payroll-runs/preview`, `POST /payroll-runs/:id/finalize`
- `GET/POST /salary-structures`
- `GET /payslips?employeeId=&month=`
- `POST /attendance/import`, `GET /attendance/summary`
- `GET /reports/payroll-cost`, `GET /reports/headcount`

RTK Query usage:
- Feature-wise API files.
- Tag invalidation (`Employees`, `PayrollRuns`, `Payslips`).
- Polling only where needed (approval queue).

Use `createAsyncThunk` only for complex orchestrations (e.g., multi-step payroll run with prechecks + finalize).

---

## 8) Design System Tokens

Use CSS variables in `theme/tokens.css` and map into Tailwind config.

- Primary: `--color-primary-500`
- Success: `--color-success-500`
- Danger: `--color-danger-500`
- Typography scale + spacing scale as fixed tokens
- Consistent card radius and shadow for enterprise UI consistency

---

## 9) Advanced Features

- Bulk payroll processing (department/location batches)
- Export payroll/payslips/reports to Excel
- Notifications (email + WhatsApp webhook)
- Saved filters and recent search presets
- Virtualized tables for large employee datasets

---

## 10) Validation Checklist

- ✅ Feature boundaries isolated and scalable
- ✅ Role-based route and component-level controls covered
- ✅ Payroll run flow includes preview + anomaly handling + finalize
- ✅ Responsive and practical for HR operations
- ✅ Ready to integrate with existing backend modules
