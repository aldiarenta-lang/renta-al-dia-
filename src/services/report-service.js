import { pool } from '../db/pool.js';
import { months } from '../config/resources.js';

export function buildMonthlyReports(year, companyId) {
  return Promise.all([
    pool.query(
      `SELECT EXTRACT(MONTH FROM sale_date)::int AS month_number,
              COALESCE(SUM(net_revenue) FILTER (WHERE status = 'Completado'), 0) AS revenue,
              COALESCE(SUM(total_direct_cost) FILTER (WHERE status = 'Completado'), 0) AS sales_direct_cost,
              COALESCE(SUM(contribution_margin) FILTER (WHERE status = 'Completado'), 0) AS contribution,
              COALESCE(SUM(cash_receipts) FILTER (WHERE status = 'Completado'), 0) AS cash_receipts,
              COALESCE(SUM(credit_receipts) FILTER (WHERE status = 'Completado'), 0) AS credit_receipts,
              COALESCE(SUM(quantity) FILTER (WHERE status = 'Completado'), 0) AS services,
              COUNT(DISTINCT client_nit) FILTER (WHERE status = 'Completado') AS active_clients
       FROM sales_calculated
       WHERE company_id = $2
         AND sale_date >= make_date($1, 1, 1) AND sale_date < make_date($1, 1, 7)
       GROUP BY GROUPING SETS ((month_number), ())`,
      [year, companyId]
    ),
    pool.query(
      `SELECT period AS month, COALESCE(SUM(budgeted_direct_cost), 0) AS total
       FROM service_costs_calculated
       WHERE company_id = $2 AND period = ANY($1::text[])
       GROUP BY period`,
      [months.slice(0, 6), companyId]
    ),
    pool.query(
      `SELECT month,
              COALESCE(SUM(monthly_equivalent), 0) AS total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE expense_type = 'Fijo'), 0) AS fixed_total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE category = 'Comercial'), 0) AS commercial_total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE category <> 'Comercial'), 0) AS administrative_total
       FROM expenses_calculated
       WHERE company_id = $2 AND month = ANY($1::text[])
       GROUP BY month`,
      [months.slice(0, 6), companyId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(total_employer_cost), 0) AS total,
              COALESCE(SUM(estimated_net), 0) AS payroll_net,
              COALESCE(SUM(employer_health + employer_pension + employer_arl
                + family_compensation + sena + icbf), 0) AS employer_contributions
       FROM payroll_calculated
       WHERE company_id = $1`,
      [companyId]
    ),
    pool.query(
      `SELECT id, transaction_date, transaction_type, amount, annual_interest_rate,
              term_months, monthly_payment, monthly_depreciation, useful_life_years
       FROM investments_financing_calculated
       WHERE company_id = $1`,
      [companyId]
    ),
    pool.query(
      `SELECT EXTRACT(MONTH FROM due_date)::int AS month_number,
              COALESCE(SUM(paid_amount), 0) AS tax_paid
       FROM tax_obligations
       WHERE company_id = $2 AND due_date >= make_date($1, 1, 1)
         AND due_date < make_date($1, 1, 7)
       GROUP BY month_number`,
      [year, companyId]
    )
  ]);
}

export function rowsByMonth(rows) {
  const map = new Map(rows.map((row) => [row.month, Number(row.total)]));
  return months.map((month) => map.get(month) || 0);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

export function transactionDateParts(value) {
  const isoDate = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new TypeError('La fecha de la transacción de inversión no es válida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (month < 1 || month > 12 || parsed.getUTCDate() !== day || parsed.getUTCMonth() !== month - 1) {
    throw new TypeError('La fecha de la transacción de inversión no es válida.');
  }
  return { year, month: month - 1 };
}

export function calculateIrr(cashFlows) {
  if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) return null;
  const npv = (rate) => cashFlows.reduce((value, cashFlow, index) => value + cashFlow / Math.pow(1 + rate, index), 0);
  let lower = -0.9999;
  let upper = 1;
  while (npv(lower) * npv(upper) > 0 && upper < 1024) upper = upper * 2 + 1;
  if (npv(lower) * npv(upper) > 0) return null;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (npv(lower) * npv(middle) <= 0) upper = middle;
    else lower = middle;
  }
  return Math.pow(1 + (lower + upper) / 2, 12) - 1;
}

export function calculateEmployerPayroll(config, salary, transport, salaryFactor = 1) {
  const value = (key) => Number(config[key] || 0);
  const monthlySalary = Math.round(Number(salary) * salaryFactor);
  const monthlyTransport = Math.round(Number(transport) * salaryFactor);
  const employerHealth = Math.round(monthlySalary * value('employer_health_rate'));
  const employerPension = Math.round(monthlySalary * value('employer_pension_rate'));
  const employerArl = Math.round(monthlySalary * value('default_arl_rate'));
  const familyCompensation = Math.round(monthlySalary * value('family_compensation_rate'));
  const sena = Math.round(monthlySalary * value('sena_rate'));
  const icbf = Math.round(monthlySalary * value('icbf_rate'));
  const provisionBase = monthlySalary + monthlyTransport;
  const severance = Math.round(provisionBase * value('severance_provision_rate'));
  const severanceInterest = Math.round(provisionBase * value('severance_interest_rate'));
  const serviceBonus = Math.round(provisionBase * value('service_bonus_rate'));
  const vacation = Math.round(provisionBase * value('vacation_provision_rate'));
  const employerContributions = employerHealth + employerPension + employerArl
    + familyCompensation + sena + icbf;
  const provisions = severance + severanceInterest + serviceBonus + vacation;
  const employeeHealth = Math.round(monthlySalary * value('employee_health_rate'));
  const employeePension = Math.round(monthlySalary * value('employee_pension_rate'));
  return {
    salary: monthlySalary,
    transport: monthlyTransport,
    employeeHealth,
    employeePension,
    employerHealth,
    employerPension,
    employerArl,
    familyCompensation,
    sena,
    icbf,
    severance,
    severanceInterest,
    serviceBonus,
    vacation,
    employerContributions,
    provisions,
    employerCost: monthlySalary + monthlyTransport + employerContributions + provisions,
    netPay: monthlySalary + monthlyTransport - employeeHealth - employeePension
  };
}

export function calculateNetPresentValue(cashFlows, annualDiscountRate) {
  const monthlyRate = Math.pow(1 + Number(annualDiscountRate), 1 / 12) - 1;
  return cashFlows.reduce((value, cashFlow, index) =>
    value + cashFlow / Math.pow(1 + monthlyRate, index + 1), 0
  );
}

export function calculatePaybackMonths(cashFlows, initialInvestment) {
  if (initialInvestment <= 0) return null;
  let balance = -initialInvestment;
  const recoveredAt = cashFlows.findIndex((cashFlow) => {
    balance += cashFlow;
    return balance >= 0;
  });
  return recoveredAt < 0 ? null : recoveredAt + 1;
}

export function buildForecastSchedule(fiscalYear) {
  return Array.from({ length: 42 }, (_, index) => {
    const fiscalMonth = 6 + index;
    const yearOffset = Math.floor(fiscalMonth / 12);
    const year = Number(fiscalYear) + yearOffset;
    const monthName = months[fiscalMonth % 12];
    return { month: `${monthName} ${year}`, monthName, fiscalMonth, year, yearOffset };
  });
}

function scenarioAdjustments(config, scenario) {
  const scenarioKey = {
    Conservador: 'conservative',
    Base: 'base',
    Optimista: 'optimistic'
  }[scenario];
  const prefix = `scenario_${scenarioKey}`;
  return {
    revenue: Number(config[`${prefix}_revenue_adjustment`] || 0),
    directCost: Number(config[`${prefix}_direct_cost_adjustment`] || 0),
    expenses: Number(config[`${prefix}_expense_adjustment`] || 0)
  };
}

export function buildScenarioSummaries(forecast, config) {
  return ['Conservador', 'Base', 'Optimista'].map((scenario) => {
    const adjustments = scenarioAdjustments(config, scenario);
    const rows = forecast.map((row) => {
      const base = row.projectionBase;
      const revenue = base.revenue * (1 + adjustments.revenue);
      const directCost = base.directCost * (1 + adjustments.directCost);
      const commercialExpenses = base.commercialExpenses * (1 + adjustments.expenses);
      const administrativeExpenses = base.administrativeExpenses * (1 + adjustments.expenses);
      const officeExpense = base.officeExpense * (1 + adjustments.expenses);
      const advertisingExpense = base.advertisingExpense * (1 + adjustments.expenses);
      const ebitda = revenue - directCost - commercialExpenses - administrativeExpenses
        - officeExpense - advertisingExpense - row.payroll;
      const operatingProfit = ebitda - row.depreciation;
      const profitBeforeTax = operatingProfit - row.financeExpense;
      const incomeTax = Math.max(0, profitBeforeTax) * Number(config.income_tax_rate);
      return {
        year: row.year, revenue, directCost, grossProfit: revenue - directCost,
        commercialExpenses: commercialExpenses + advertisingExpense,
        administrativeExpenses: administrativeExpenses + officeExpense,
        ebitda, operatingProfit, profitBeforeTax, incomeTax,
        netProfit: profitBeforeTax - incomeTax
      };
    });
    const years = Array.from(new Set(rows.map((row) => row.year))).map((year) => {
      const annualRows = rows.filter((row) => row.year === year);
      const revenue = sum(annualRows, 'revenue');
      const netProfit = sum(annualRows, 'netProfit');
      return {
        year,
        revenue,
        directCost: sum(annualRows, 'directCost'),
        grossProfit: sum(annualRows, 'grossProfit'),
        commercialExpenses: sum(annualRows, 'commercialExpenses'),
        administrativeExpenses: sum(annualRows, 'administrativeExpenses'),
        ebitda: sum(annualRows, 'ebitda'),
        operatingProfit: sum(annualRows, 'operatingProfit'),
        profitBeforeTax: sum(annualRows, 'profitBeforeTax'),
        incomeTax: sum(annualRows, 'incomeTax'),
        netProfit,
        netMargin: revenue > 0 ? netProfit / revenue : null
      };
    });
    return { scenario, years };
  });
}

export async function breakEvenReport(data) {
  const meanMonthlyPayroll = data.payroll.slice(0, 6).reduce((sum, value) => sum + value, 0) / 6;
  const fixedExpenses = data.fixedExpenses.slice(0, 6).reduce((sum, value) => sum + value, 0) / 6;
  const fixedCosts = fixedExpenses + meanMonthlyPayroll;
  const services = data.services.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const revenue = data.revenue.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const directCost = data.salesDirectCost.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const actualExpenses = data.expenses.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const monthlyRevenue = revenue / 6;
  const monthlyDirectCost = directCost / 6;
  const variableOperatingExpense = Math.max(0, actualExpenses - fixedExpenses * 6) / 6;
  const monthlyFixedCosts = fixedCosts;
  const contribution = revenue - directCost - variableOperatingExpense * 6;
  const contributionPerService = services > 0 ? contribution / services : null;
  const contributionMarginRate = monthlyRevenue > 0
    ? (monthlyRevenue - monthlyDirectCost - variableOperatingExpense) / monthlyRevenue
    : null;
  const breakEvenServices = contributionPerService && contributionPerService > 0
    ? Math.ceil(monthlyFixedCosts / contributionPerService)
    : null;
  const breakEvenRevenue = contributionMarginRate && contributionMarginRate > 0
    ? monthlyFixedCosts / contributionMarginRate
    : null;
  const averageRevenuePerClient = data.activeClients > 0 ? revenue / data.activeClients : null;
  const monthlyRevenuePerClient = averageRevenuePerClient === null ? null : averageRevenuePerClient / 6;
  const breakEvenClients = breakEvenRevenue !== null && monthlyRevenuePerClient > 0
    ? Math.ceil(breakEvenRevenue / monthlyRevenuePerClient)
    : null;
  const breakEvenAt = (scenarioRevenue, scenarioDirectCost) => {
    if (scenarioRevenue <= 0) return null;
    const marginRate = (scenarioRevenue - scenarioDirectCost - variableOperatingExpense) / scenarioRevenue;
    return marginRate > 0 ? monthlyFixedCosts / marginRate : null;
  };
  const breakEvenSeries = months.slice(0, 6).map((month, index) => {
    const monthlyVariable = data.salesDirectCost[index] + Math.max(0, data.expenses[index] - data.fixedExpenses[index]);
    return {
      month,
      revenue: data.revenue[index],
      costs: monthlyVariable + data.fixedExpenses[index] + data.payroll[index],
      fixedCosts: data.fixedExpenses[index] + data.payroll[index]
    };
  });
  const priceIncrease = Number(data.annualPriceIncrease || 0);
  const costIncrease = Number(data.annualDirectCostGrowth || 0);
  const sensitivity = [
    { scenario: 'Base observado', revenue: monthlyRevenue, costs: monthlyDirectCost + variableOperatingExpense + monthlyFixedCosts, breakEvenRevenue },
    {
      scenario: 'Precio según incremento anual configurado',
      revenue: monthlyRevenue * (1 + priceIncrease),
      costs: monthlyDirectCost + variableOperatingExpense + monthlyFixedCosts,
      breakEvenRevenue: breakEvenAt(monthlyRevenue * (1 + priceIncrease), monthlyDirectCost)
    },
    {
      scenario: 'Costos directos según crecimiento anual configurado',
      revenue: monthlyRevenue,
      costs: monthlyDirectCost * (1 + costIncrease) + variableOperatingExpense + monthlyFixedCosts,
      breakEvenRevenue: breakEvenAt(monthlyRevenue, monthlyDirectCost * (1 + costIncrease))
    }
  ];
  return {
    configured: true,
    year: data.year,
    fixedCosts,
    variableCosts: monthlyDirectCost + variableOperatingExpense,
    contributionMarginRate,
    averageRevenuePerService: services > 0 ? revenue / services : null,
    averageDirectCostPerService: services > 0 ? directCost / services : null,
    contributionPerService,
    breakEvenServices,
    breakEvenClients,
    monthlyBreakEvenRevenue: breakEvenRevenue,
    monthlyIncomeRequired: breakEvenRevenue,
    averageRevenuePerClient,
    monthlyRevenuePerClient,
    breakEvenSeries,
    sensitivity
  };
}

export async function reportData(companyId) {
  const settings = await pool.query('SELECT * FROM company_settings WHERE company_id = $1', [companyId]);
  if (!settings.rowCount) return { configured: false };
  const config = settings.rows[0];
  config.company_id = companyId;
  const [sales, costs, expenses, payroll, investments, taxes] = await buildMonthlyReports(config.fiscal_year, companyId);
  const revenue = Array(12).fill(0);
  const salesDirectCost = Array(12).fill(0);
  const contribution = Array(12).fill(0);
  const cashReceipts = Array(12).fill(0);
  const creditReceipts = Array(12).fill(0);
  const services = Array(12).fill(0);
  let activeClients = 0;
  for (const row of sales.rows) {
    if (row.month_number === null) {
      activeClients = Number(row.active_clients);
      continue;
    }
    const index = Number(row.month_number) - 1;
    revenue[index] = Number(row.revenue);
    salesDirectCost[index] = Number(row.sales_direct_cost);
    contribution[index] = Number(row.contribution);
    cashReceipts[index] = Number(row.cash_receipts);
    creditReceipts[index] = Number(row.credit_receipts);
    services[index] = Number(row.services);
  }
  const serviceCosts = rowsByMonth(costs.rows);
  const monthlyExpenses = rowsByMonth(expenses.rows);
  const commercialExpenses = expenses.rows.reduce((values, row) => {
    values[months.indexOf(row.month)] = Number(row.commercial_total);
    return values;
  }, Array(12).fill(0));
  const administrativeExpenses = expenses.rows.reduce((values, row) => {
    values[months.indexOf(row.month)] = Number(row.administrative_total);
    return values;
  }, Array(12).fill(0));
  const monthlyFixedExpenses = expenses.rows.reduce((values, row) => {
    values[months.indexOf(row.month)] = Number(row.fixed_total);
    return values;
  }, Array(12).fill(0));
  const actualTaxPayments = Array(12).fill(0);
  for (const row of taxes.rows) actualTaxPayments[Number(row.month_number) - 1] = Number(row.tax_paid);
  const payrollTotal = Number(payroll.rows[0].total);
  const payrollNet = Number(payroll.rows[0].payroll_net);
  const employerContributions = Number(payroll.rows[0].employer_contributions);
  const investmentSummary = {};
  const financingInflows = Array(12).fill(0);
  const investmentOutflows = Array(12).fill(0);
  const financingPayments = Array(12).fill(0);
  const projectedFinancingPayments = Array(42).fill(0);
  const projectedFinancingPrincipalPayments = Array(42).fill(0);
  const projectedFinancingInflows = Array(42).fill(0);
  const projectedInvestmentPayments = Array(42).fill(0);
  const projectedAssetAdditions = Array(42).fill(0);
  const projectedDebtAdditions = Array(42).fill(0);
  const projectedEquityAdditions = Array(42).fill(0);
  const monthlyDepreciation = Array(48).fill(0);
  const monthlyFinanceExpense = Array(48).fill(0);
  for (const row of investments.rows) {
    const { year: transactionYear, month: startMonth } = transactionDateParts(row.transaction_date);
    const startPeriod = (transactionYear - Number(config.fiscal_year)) * 12 + startMonth;
    const amount = Number(row.amount);
    const usefulLifeMonths = Math.ceil(Number(row.useful_life_years || 0) * 12);
    if (row.transaction_type.startsWith('Activo') && usefulLifeMonths > 0) {
      for (let month = Math.max(0, startPeriod); month < Math.min(48, startPeriod + usefulLifeMonths); month += 1) {
        monthlyDepreciation[month] += Number(row.monthly_depreciation);
      }
    }
    const termMonths = Number(row.term_months || 0);
    if (startPeriod >= 6 && startPeriod < 48) {
      const forecastIndex = startPeriod - 6;
      if (row.transaction_type === 'Financiación') {
        projectedFinancingInflows[forecastIndex] += amount;
        projectedDebtAdditions[forecastIndex] += amount;
      } else if (row.transaction_type === 'Aporte socio') {
        projectedFinancingInflows[forecastIndex] += amount;
        projectedEquityAdditions[forecastIndex] += amount;
      } else {
        projectedInvestmentPayments[forecastIndex] += amount;
        if (row.transaction_type.startsWith('Activo')) {
          projectedAssetAdditions[forecastIndex] += amount;
        }
      }
    }
    if (row.transaction_type === 'Financiación' && termMonths > 0) {
      let remainingLoan = amount;
      for (let installment = 0; installment < termMonths; installment += 1) {
        const month = startPeriod + installment;
        const interestPayment = remainingLoan * Number(row.annual_interest_rate) / 12;
        const payment = Math.min(Number(row.monthly_payment), remainingLoan + interestPayment);
        const principalPayment = Math.min(
          remainingLoan,
          Math.max(0, payment - interestPayment)
        );
        if (month >= 0 && month < 48) {
          monthlyFinanceExpense[month] += interestPayment;
          if (month >= 6 && month < 48) {
            projectedFinancingPayments[month - 6] += payment;
            projectedFinancingPrincipalPayments[month - 6] += principalPayment;
          } else if (month >= 0 && month < 6) {
            financingPayments[month] += payment;
          }
        }
        remainingLoan = Math.max(0, remainingLoan - principalPayment);
      }
    }
    if (transactionYear === Number(config.fiscal_year) && startMonth < 6) {
      investmentSummary[row.transaction_type] = (investmentSummary[row.transaction_type] || 0) + amount;
      if (row.transaction_type === 'Financiación' || row.transaction_type === 'Aporte socio') {
        financingInflows[startMonth] += amount;
      } else {
        investmentOutflows[startMonth] += amount;
      }
    }
  }
  const monthlyEbitda = revenue.map((amount, index) =>
    index < 6 ? amount - salesDirectCost[index] - commercialExpenses[index] - administrativeExpenses[index] - payrollTotal : 0
  );
  const monthlyOperatingProfit = monthlyEbitda.map((amount, index) => amount - monthlyDepreciation[index]);
  const monthlyFinanceExpenses = Array.from({ length: 12 }, (_, index) => index < 6 ? monthlyFinanceExpense[index] : 0);
  const monthlyProfitBeforeTax = monthlyOperatingProfit.map((amount, index) => amount - monthlyFinanceExpenses[index]);
  const monthlyTax = monthlyProfitBeforeTax.map((amount, index) =>
    index < 6 ? Math.max(0, amount) * Number(config.income_tax_rate) : 0
  );
  const monthlyNetProfit = monthlyProfitBeforeTax.map((amount, index) => amount - monthlyTax[index]);
  const monthlyPayrollCash = payrollTotal;
  const monthlyOutflow = salesDirectCost.map((amount, index) =>
    index < 6
      ? amount + monthlyExpenses[index] + monthlyPayrollCash + investmentOutflows[index] + financingPayments[index]
      : 0
  );
  const monthlyNetCashFlow = monthlyOutflow.map((amount, index) =>
    index < 6
      ? cashReceipts[index] + creditReceipts[index] + financingInflows[index] - amount - actualTaxPayments[index]
      : 0
  );
  const startingCash = Number(config.opening_cash);
  const endingCash = Array(12).fill(startingCash);
  let cash = startingCash;
  for (let index = 0; index < 6; index += 1) {
    cash += monthlyNetCashFlow[index];
    endingCash[index] = cash;
  }
  const average = (values, start = 0, end = 6) => values.slice(start, end).reduce((sum, value) => sum + value, 0) / (end - start);
  const numeric = (key) => Number(config[key] || 0);
  const fiscalYear = Number(config.fiscal_year);
  const forecast = [];
  const revenueGrowth = numeric('monthly_sales_growth');
  const directGrowth = numeric('annual_direct_cost_growth');
  const expenseGrowth = numeric('annual_expense_growth');
  const baseRevenue = average(revenue);
  const baseDirectCost = average(salesDirectCost);
  const baseCommercialExpense = average(commercialExpenses);
  const baseAdministrativeExpense = average(administrativeExpenses);
  const firstHalfRevenue = revenue.slice(0, 6).reduce((sum, value) => sum + value, 0);
  const cashCollectionRate = firstHalfRevenue > 0
    ? cashReceipts.slice(0, 6).reduce((sum, value) => sum + value, 0) / firstHalfRevenue
    : 0;
  const schedule = buildForecastSchedule(fiscalYear);
  const selectedScenarioAdjustments = scenarioAdjustments(config, config.scenario);
  for (let index = 0; index < schedule.length; index += 1) {
    const step = index + 1;
    const { monthName, fiscalMonth, year, yearOffset } = schedule[index];
    const monthLabel = schedule[index].month;
    const baseProjectedRevenue = baseRevenue
      * Math.pow(1 + revenueGrowth, step)
      * Math.pow(1 + numeric('annual_client_growth'), yearOffset)
      * Math.pow(1 + numeric('annual_price_increase'), yearOffset);
    const baseProjectedDirectCost = baseDirectCost
      * Math.pow(1 + directGrowth, step / 12)
      * Math.pow(1 + numeric('annual_inflation'), yearOffset);
    const baseProjectedCommercialExpense = baseCommercialExpense
      * Math.pow(1 + expenseGrowth, step / 12)
      * Math.pow(1 + numeric('annual_inflation'), yearOffset);
    const baseProjectedAdministrativeExpense = baseAdministrativeExpense
      * Math.pow(1 + expenseGrowth, step / 12)
      * Math.pow(1 + numeric('annual_inflation'), yearOffset);
    const salaryFactor = Math.pow(1 + numeric('annual_salary_increase'), yearOffset);
    const officeFactor = Math.pow(1 + numeric('annual_inflation'), yearOffset);
    const officeRent = numeric('office_rent_monthly') * Math.pow(1 + numeric('annual_rent_increase'), yearOffset);
    const officeUtilities = numeric('office_utilities_monthly') * Math.pow(1 + numeric('annual_utilities_increase'), yearOffset);
    const officeOtherCosts = [
      numeric('office_internet_monthly'), numeric('office_cleaning_monthly'),
      numeric('office_cafeteria_monthly'), numeric('office_stationery_monthly'),
      numeric('office_maintenance_monthly'), numeric('office_software_monthly'),
      numeric('office_security_monthly'), numeric('office_other_monthly')
    ].reduce((sum, value) => sum + value, 0) * officeFactor;
    const baseOfficeExpense = officeRent + officeUtilities + officeOtherCosts;
    const adminEmployee = calculateEmployerPayroll(
      config, numeric('projected_admin_salary'), numeric('projected_admin_transport'), salaryFactor
    );
    const cleaningEmployee = calculateEmployerPayroll(
      config, numeric('projected_cleaning_salary'), numeric('projected_cleaning_transport'), salaryFactor
    );
    const existingPayrollCost = payrollTotal * salaryFactor;
    const projectedPayrollCost = existingPayrollCost + adminEmployee.employerCost + cleaningEmployee.employerCost;
    const projectedPayrollNet = payrollNet * salaryFactor + adminEmployee.netPay + cleaningEmployee.netPay;
    const projectedEmployerContributions = employerContributions * salaryFactor
      + adminEmployee.employerContributions + cleaningEmployee.employerContributions;
    const advertisingBudgets = [numeric('advertising_year_1'), numeric('advertising_year_2'), numeric('advertising_year_3')];
    const annualAdvertising = advertisingBudgets[yearOffset] ?? advertisingBudgets.at(-1)
      * Math.pow(1 + numeric('annual_advertising_increase'), yearOffset - 2);
    const baseAdvertisingExpense = annualAdvertising / 12;
    const projectedRevenue = baseProjectedRevenue * (1 + selectedScenarioAdjustments.revenue);
    const projectedDirectCost = baseProjectedDirectCost * (1 + selectedScenarioAdjustments.directCost);
    const projectedCommercialExpense = baseProjectedCommercialExpense * (1 + selectedScenarioAdjustments.expenses);
    const projectedAdministrativeExpense = baseProjectedAdministrativeExpense * (1 + selectedScenarioAdjustments.expenses);
    const officeExpense = baseOfficeExpense * (1 + selectedScenarioAdjustments.expenses);
    const advertisingExpense = baseAdvertisingExpense * (1 + selectedScenarioAdjustments.expenses);
    const projectedExpenses = projectedCommercialExpense + projectedAdministrativeExpense;
    const projectedEbitda = projectedRevenue - projectedDirectCost - projectedExpenses
      - officeExpense - advertisingExpense - projectedPayrollCost;
    const projectedDepreciation = monthlyDepreciation[fiscalMonth] || 0;
    const projectedOperatingProfit = projectedEbitda - projectedDepreciation;
    const projectedFinanceExpense = monthlyFinanceExpense[fiscalMonth] || 0;
    const projectedProfitBeforeTax = projectedOperatingProfit - projectedFinanceExpense;
    const projectedIncomeTax = Math.max(0, projectedProfitBeforeTax) * numeric('income_tax_rate');
    forecast.push({
      month: monthLabel,
      year,
      monthName,
      yearOffset,
      revenue: projectedRevenue,
      directCost: projectedDirectCost,
      commercialExpenses: projectedCommercialExpense + advertisingExpense,
      advertisingExpense,
      administrativeExpenses: projectedAdministrativeExpense + officeExpense,
      officeExpense,
      expenses: projectedExpenses + officeExpense + advertisingExpense,
      payroll: projectedPayrollCost,
      payrollNet: projectedPayrollNet,
      employerContributions: projectedEmployerContributions,
      ebitda: projectedEbitda,
      depreciation: projectedDepreciation,
      operatingProfit: projectedOperatingProfit,
      financeExpense: projectedFinanceExpense,
      profitBeforeTax: projectedProfitBeforeTax,
      incomeTax: projectedIncomeTax,
      netProfit: projectedProfitBeforeTax - projectedIncomeTax,
      netMargin: projectedRevenue === 0 ? null : (projectedProfitBeforeTax - projectedIncomeTax) / projectedRevenue,
      customerReceipts: 0,
      financingInflows: projectedFinancingInflows[index],
      directCostPayments: projectedDirectCost,
      investmentPayments: projectedInvestmentPayments[index],
      financingPayments: projectedFinancingPayments[index],
      financingPrincipalPayment: projectedFinancingPrincipalPayments[index],
      payrollDetails: {
        administrativeAssistant: adminEmployee,
        cleaningAssistant: cleaningEmployee
      },
      projectionBase: {
        revenue: baseProjectedRevenue,
        directCost: baseProjectedDirectCost,
        commercialExpenses: baseProjectedCommercialExpense,
        administrativeExpenses: baseProjectedAdministrativeExpense,
        officeExpense: baseOfficeExpense,
        advertisingExpense: baseAdvertisingExpense
      },
      activeClients: Math.round(activeClients * Math.pow(1 + numeric('annual_client_growth'), yearOffset)),
      services: average(services) * Math.pow(1 + revenueGrowth, step)
    });
  }
  const scenarioSummaries = buildScenarioSummaries(forecast, config);
  for (const row of forecast) delete row.projectionBase;
  let projectedCash = endingCash[5];
  let accumulatedProfit = 0;
  let accumulatedEquityContributions = 0;
  let taxPayable = 0;
  let remainingDebt = numeric('opening_long_term_liabilities');
  let cumulativeDepreciation = 0;
  let cumulativeAssetAdditions = 0;
  let previousReceivables = creditReceipts[5] * Number(config.average_receivable_days) / 30;
  let previousInventory = salesDirectCost[5] * Number(config.inventory_days) / 30;
  let previousPayables = numeric('opening_current_liabilities');
  const annualForecastTax = new Map();
  for (const row of forecast) {
    annualForecastTax.set(row.year, (annualForecastTax.get(row.year) || 0) + row.incomeTax);
  }
  for (let index = 0; index < forecast.length; index += 1) {
    const row = forecast[index];
    row.taxPayment = row.monthName === 'Diciembre'
      ? annualForecastTax.get(row.year)
      : 0;
    row.receivables = row.revenue * (1 - cashCollectionRate)
      * Number(config.average_receivable_days) / 30;
    row.inventory = row.directCost * Number(config.inventory_days) / 30;
    row.operatingPayables = row.directCost * Number(config.average_payable_days) / 30;
    taxPayable += row.incomeTax - row.taxPayment;
    row.currentLiabilities = row.operatingPayables + taxPayable;
    row.customerReceipts = row.revenue + previousReceivables - row.receivables;
    row.directCostPayments = row.directCost + row.inventory - previousInventory
      + previousPayables - row.operatingPayables;
    const payrollCash = row.payroll;
    const payments = row.directCostPayments + payrollCash + row.expenses
      + row.taxPayment + row.investmentPayments + row.financingPayments;
    row.netCashFlow = row.customerReceipts + row.financingInflows - payments;
    projectedCash += row.netCashFlow;
    row.endingCash = projectedCash;
    accumulatedProfit += row.netProfit;
    accumulatedEquityContributions += projectedEquityAdditions[index];
    remainingDebt = Math.max(0, remainingDebt + projectedDebtAdditions[index] - row.financingPrincipalPayment);
    cumulativeDepreciation += row.depreciation;
    cumulativeAssetAdditions += projectedAssetAdditions[index];
    row.currentAssets = row.endingCash + numeric('opening_other_current_assets') + row.receivables + row.inventory;
    row.noncurrentAssets = Math.max(
      0,
      numeric('opening_noncurrent_assets') + cumulativeAssetAdditions - cumulativeDepreciation
    );
    row.longTermLiabilities = remainingDebt;
    row.totalAssets = row.currentAssets + row.noncurrentAssets;
    row.totalLiabilities = row.currentLiabilities + row.longTermLiabilities;
    row.equity = numeric('opening_equity') + accumulatedProfit + accumulatedEquityContributions;
    row.balanceDifference = row.totalAssets - row.totalLiabilities - row.equity;
    previousReceivables = row.receivables;
    previousInventory = row.inventory;
    previousPayables = row.operatingPayables;
  }
  const years = Array.from({ length: 4 }, (_, yearOffset) => {
    const year = fiscalYear + yearOffset;
    const rows = forecast.filter((row) => row.year === year);
    const revenueTotal = sum(rows, 'revenue');
    const netProfit = sum(rows, 'netProfit');
    const first = rows[0];
    const last = rows.at(-1);
    return {
      year,
      rows,
      revenue: revenueTotal,
      directCost: sum(rows, 'directCost'),
      grossProfit: revenueTotal - sum(rows, 'directCost'),
      commercialExpenses: sum(rows, 'commercialExpenses'),
      administrativeExpenses: sum(rows, 'administrativeExpenses'),
      payroll: sum(rows, 'payroll'),
      payrollNet: sum(rows, 'payrollNet'),
      employerContributions: sum(rows, 'employerContributions'),
      officeExpense: sum(rows, 'officeExpense'),
      advertisingExpense: sum(rows, 'advertisingExpense'),
      ebitda: sum(rows, 'ebitda'),
      depreciation: sum(rows, 'depreciation'),
      operatingProfit: sum(rows, 'operatingProfit'),
      financeExpense: sum(rows, 'financeExpense'),
      profitBeforeTax: sum(rows, 'profitBeforeTax'),
      incomeTax: sum(rows, 'incomeTax'),
      netProfit,
      netMargin: revenueTotal === 0 ? null : netProfit / revenueTotal,
      netCashFlow: sum(rows, 'netCashFlow'),
      endingCash: last?.endingCash ?? null,
      balance: last ? {
        cash: last.endingCash,
        currentAssets: last.currentAssets,
        noncurrentAssets: last.noncurrentAssets,
        totalAssets: last.totalAssets,
        currentLiabilities: last.currentLiabilities,
        longTermLiabilities: last.longTermLiabilities,
        totalLiabilities: last.totalLiabilities,
        equity: last.equity,
        workingCapital: last.currentAssets - last.currentLiabilities,
        currentRatio: last.currentLiabilities > 0 ? last.currentAssets / last.currentLiabilities : null,
        quickRatio: last.currentLiabilities > 0
          ? (last.currentAssets - last.inventory) / last.currentLiabilities
          : null,
        debtRatio: last.totalAssets > 0 ? last.totalLiabilities / last.totalAssets : null,
        balanceDifference: last.balanceDifference
      } : null,
      comparison: {
        revenueGrowth: null,
        profitGrowth: null,
        revenueBase: null,
        profitBase: null
      }
    };
  });
  const openingAssets = endingCash[5] + numeric('opening_other_current_assets') + numeric('opening_noncurrent_assets');
  for (let index = 1; index < years.length; index += 1) {
    const previousYearScale = index === 1 ? 2 : 1;
    years[index].comparison.revenueBase = years[index - 1].revenue * previousYearScale;
    years[index].comparison.profitBase = years[index - 1].netProfit * previousYearScale;
    years[index].comparison.revenueGrowth = years[index].comparison.revenueBase !== 0
      ? years[index].revenue / years[index].comparison.revenueBase - 1
      : null;
    years[index].comparison.profitGrowth = years[index].comparison.profitBase !== 0
      ? years[index].netProfit / years[index].comparison.profitBase - 1
      : null;
  }
  for (let index = 0; index < years.length; index += 1) {
    const beginningAssets = index === 0 ? openingAssets : years[index - 1].balance?.totalAssets;
    const beginningEquity = index === 0 ? numeric('opening_equity') : years[index - 1].balance?.equity;
    const endingAssets = years[index].balance?.totalAssets;
    const endingEquity = years[index].balance?.equity;
    const averageAssets = beginningAssets === undefined ? null : (beginningAssets + endingAssets) / 2;
    const averageEquity = beginningEquity === undefined ? null : (beginningEquity + endingEquity) / 2;
    years[index].roa = averageAssets > 0 ? years[index].netProfit / averageAssets : null;
    years[index].roe = averageEquity !== 0 ? years[index].netProfit / averageEquity : null;
  }
  const historicalRevenue = revenue.slice(0, 6).reduce((total, value) => total + value, 0);
  const historicalDirectCost = salesDirectCost.slice(0, 6).reduce((total, value) => total + value, 0);
  const historicalNetProfit = monthlyNetProfit.slice(0, 6).reduce((total, value) => total + value, 0);
  const historicalEbitda = monthlyEbitda.slice(0, 6).reduce((total, value) => total + value, 0);
  const initialInvestment = Object.entries(investmentSummary)
    .filter(([type]) => type.startsWith('Activo'))
    .reduce((total, [, value]) => total + value, 0);
  const npv = calculateNetPresentValue(forecast.map((row) => row.netCashFlow), numeric('discount_rate')) - initialInvestment;
  const irr = calculateIrr([-initialInvestment, ...forecast.map((row) => row.netCashFlow)]);
  const paybackMonths = calculatePaybackMonths(forecast.map((row) => row.netCashFlow), initialInvestment);
  const finalYear = years.at(-1);
  const finalBalance = finalYear.balance;
  const historicalServices = services.slice(0, 6).reduce((total, value) => total + value, 0);
  const strategicIndicators = {
    npv,
    irr,
    paybackMonths,
    paybackYears: paybackMonths === null ? null : paybackMonths / 12,
    ebitda: historicalEbitda,
    roi: initialInvestment > 0 ? sum(forecast, 'netProfit') / initialInvestment : null,
    roa: finalYear.roa,
    roe: finalYear.roe,
    grossMargin: historicalRevenue > 0 ? (historicalRevenue - historicalDirectCost) / historicalRevenue : null,
    operatingMargin: historicalRevenue > 0
      ? monthlyOperatingProfit.slice(0, 6).reduce((total, value) => total + value, 0) / historicalRevenue
      : null,
    netMargin: historicalRevenue > 0 ? historicalNetProfit / historicalRevenue : null,
    workingCapital: finalBalance?.workingCapital ?? null,
    currentRatio: finalBalance?.currentRatio ?? null,
    quickRatio: finalBalance?.quickRatio ?? null,
    debtRatio: finalBalance?.debtRatio ?? null,
    freeCashFlow: sum(forecast, 'netCashFlow'),
    salesGrowth: years[1].comparison.revenueGrowth,
    profitGrowth: years[1].comparison.profitGrowth,
    averageRevenuePerClient: activeClients > 0 ? historicalRevenue / activeClients : null,
    averageRevenuePerService: historicalServices > 0 ? historicalRevenue / historicalServices : null,
    activeClients,
    services: historicalServices,
    availableCash: endingCash[5],
    projectedCash: forecast.at(-1)?.endingCash ?? endingCash[5],
    profitabilityTrend: years.map(({ year, netMargin }) => ({ year, netMargin }))
  };
  return {
    configured: true,
    year: Number(config.fiscal_year),
    companyId,
    months,
    revenue,
    services,
    contribution,
    salesDirectCost,
    serviceCosts,
    expenses: monthlyExpenses,
    commercialExpenses,
    administrativeExpenses,
    fixedExpenses: monthlyFixedExpenses,
    payroll: Array.from({ length: 12 }, (_, index) => index < 6 ? payrollTotal : 0),
    payrollNet,
    employerContributions,
    ebitda: monthlyEbitda,
    depreciation: monthlyDepreciation.slice(0, 12),
    operatingProfit: monthlyOperatingProfit,
    financeExpenses: monthlyFinanceExpenses,
    profitBeforeTax: monthlyProfitBeforeTax,
    incomeTax: monthlyTax,
    netProfit: monthlyNetProfit,
    cashReceipts,
    creditReceipts,
    financingInflows,
    investmentOutflows,
    financingPayments,
    netCashFlow: monthlyNetCashFlow,
    endingCash,
    forecast,
    scenarioSummaries,
    years,
    strategicIndicators,
    activeClients,
    actualTaxPayments,
    historicalMonths: months.slice(0, 6),
    historicalEndingCash: endingCash.slice(0, 6),
    historicalNetCashFlow: monthlyNetCashFlow.slice(0, 6),
    historicalRevenue,
    cashCollectionRate,
    forecastStartingCash: endingCash[5],
    forecastEndingCash: forecast.at(-1)?.endingCash ?? endingCash[5],
    openingAssets,
    openingEquity: numeric('opening_equity'),
    openingCash: startingCash,
    discountRate: numeric('discount_rate'),
    monthlyBillableHoursPerProfessional: Number(config.monthly_billable_hours_per_professional),
    professionalCount: Number(config.professional_count),
    projectionAssumptions: {
      officeRentMonthly: numeric('office_rent_monthly'),
      officeUtilitiesMonthly: numeric('office_utilities_monthly'),
      officeInternetMonthly: numeric('office_internet_monthly'),
      officeCleaningMonthly: numeric('office_cleaning_monthly'),
      officeCafeteriaMonthly: numeric('office_cafeteria_monthly'),
      officeStationeryMonthly: numeric('office_stationery_monthly'),
      officeMaintenanceMonthly: numeric('office_maintenance_monthly'),
      officeSoftwareMonthly: numeric('office_software_monthly'),
      officeSecurityMonthly: numeric('office_security_monthly'),
      officeOtherMonthly: numeric('office_other_monthly'),
      adminSalary: numeric('projected_admin_salary'),
      adminTransport: numeric('projected_admin_transport'),
      cleaningSalary: numeric('projected_cleaning_salary'),
      cleaningTransport: numeric('projected_cleaning_transport'),
      advertisingYear1: numeric('advertising_year_1'),
      advertisingYear2: numeric('advertising_year_2'),
      advertisingYear3: numeric('advertising_year_3')
    },
    minimumCashReserve: Number(config.minimum_cash_reserve),
    targetNetMargin: Number(config.target_net_margin),
    annualPriceIncrease: numeric('annual_price_increase'),
    annualDirectCostGrowth: numeric('annual_direct_cost_growth'),
    scenario: config.scenario,
    costPerHour: payrollTotal / (Number(config.monthly_billable_hours_per_professional) * Number(config.professional_count)),
    vatRate: Number(config.vat_rate),
    incomeTaxRate: Number(config.income_tax_rate),
    investmentSummary
  };
}
