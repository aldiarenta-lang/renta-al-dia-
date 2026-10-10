import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildForecastSchedule,
  buildScenarioSummaries,
  calculateEmployerPayroll,
  calculateIrr,
  calculateNetPresentValue,
  calculatePaybackMonths,
  transactionDateParts
} from '../src/services/report-service.js';

test('construye los 42 meses desde julio del Año 1 hasta diciembre del Año 4', () => {
  const schedule = buildForecastSchedule(2026);

  assert.equal(schedule.length, 42);
  assert.deepEqual(schedule[0], {
    month: 'Julio 2026',
    monthName: 'Julio',
    fiscalMonth: 6,
    year: 2026,
    yearOffset: 0
  });
  assert.deepEqual(schedule.at(-1), {
    month: 'Diciembre 2029',
    monthName: 'Diciembre',
    fiscalMonth: 47,
    year: 2029,
    yearOffset: 3
  });
  assert.deepEqual(
    [2026, 2027, 2028, 2029].map((year) => schedule.filter((row) => row.year === year).length),
    [6, 12, 12, 12]
  );
});

test('lee las fechas de inversión devueltas por PostgreSQL como Date o ISO', () => {
  assert.deepEqual(transactionDateParts(new Date('2026-01-08T05:00:00.000Z')), { year: 2026, month: 0 });
  assert.deepEqual(transactionDateParts('2026-01-08T00:00:00.000Z'), { year: 2026, month: 0 });
  assert.throws(() => transactionDateParts('no-es-fecha'), /fecha de la transacción de inversión no es válida/);
});

test('calcula el costo patronal con las tasas de nómina configuradas', () => {
  const payroll = calculateEmployerPayroll({
    employee_health_rate: 0.04,
    employee_pension_rate: 0.04,
    employer_health_rate: 0.085,
    employer_pension_rate: 0.12,
    default_arl_rate: 0.005,
    family_compensation_rate: 0.04,
    sena_rate: 0.02,
    icbf_rate: 0.03,
    severance_provision_rate: 0.0833,
    severance_interest_rate: 0.01,
    service_bonus_rate: 0.0833,
    vacation_provision_rate: 0.0417
  }, 2000000, 200000, 1.1);

  assert.equal(payroll.salary, 2200000);
  assert.equal(payroll.transport, 220000);
  assert.equal(payroll.employerHealth, 187000);
  assert.equal(payroll.employerPension, 264000);
  assert.equal(payroll.employerArl, 11000);
  assert.equal(payroll.familyCompensation, 88000);
  assert.equal(payroll.sena, 44000);
  assert.equal(payroll.icbf, 66000);
  assert.equal(payroll.severance, 201586);
  assert.equal(payroll.severanceInterest, 24200);
  assert.equal(payroll.serviceBonus, 201586);
  assert.equal(payroll.vacation, 100914);
  assert.equal(payroll.employerContributions, 660000);
  assert.equal(payroll.provisions, 528286);
  assert.equal(payroll.employerCost, 3608286);
  assert.equal(payroll.netPay, 2244000);
});

test('calcula VPN, TIR e recuperação de inversión', () => {
  assert.equal(calculateNetPresentValue([100, 100], 0), 200);
  assert.ok(calculateNetPresentValue([100, 100], 0.1) < 200);
  assert.ok(Math.abs(calculateIrr([-100, 110]) - (Math.pow(1.1, 12) - 1)) < 1e-8);
  assert.equal(calculateIrr([0, 100]), null);
  assert.equal(calculatePaybackMonths([10, 20, 30], 25), 2);
  assert.equal(calculatePaybackMonths([5, 5], 25), null);
});

test('calcula escenarios con ajustes independientes para ventas, costos y gastos', () => {
  const summaries = buildScenarioSummaries([{
    year: 2026,
    payroll: 20,
    depreciation: 5,
    financeExpense: 0,
    projectionBase: {
      revenue: 100, directCost: 40, commercialExpenses: 10,
      administrativeExpenses: 5, officeExpense: 5, advertisingExpense: 0
    }
  }], {
    income_tax_rate: 0.2,
    scenario_conservative_revenue_adjustment: -0.1,
    scenario_conservative_direct_cost_adjustment: 0.05,
    scenario_conservative_expense_adjustment: 0.1,
    scenario_base_revenue_adjustment: 0,
    scenario_base_direct_cost_adjustment: 0,
    scenario_base_expense_adjustment: 0,
    scenario_optimistic_revenue_adjustment: 0.1,
    scenario_optimistic_direct_cost_adjustment: -0.05,
    scenario_optimistic_expense_adjustment: -0.1
  });

  assert.equal(summaries[0].years[0].revenue, 90);
  assert.equal(summaries[0].years[0].directCost, 42);
  assert.equal(summaries[0].years[0].ebitda, 6);
  assert.ok(Math.abs(summaries[0].years[0].netProfit - 0.8) < 1e-10);
  assert.equal(summaries[1].years[0].netProfit, 12);
  assert.ok(Math.abs(summaries[2].years[0].revenue - 110) < 1e-10);
  assert.ok(Math.abs(summaries[2].years[0].netProfit - 23.2) < 1e-10);
});
