import { pool } from '../db/pool.js';
import { months } from '../config/resources.js';

export function buildMonthlyReports(year) {
  return Promise.all([
    pool.query(
      `SELECT EXTRACT(MONTH FROM sale_date)::int AS month_number,
              COALESCE(SUM(net_revenue) FILTER (WHERE status = 'Completado'), 0) AS revenue,
              COALESCE(SUM(total_direct_cost) FILTER (WHERE status = 'Completado'), 0) AS sales_direct_cost,
              COALESCE(SUM(contribution_margin) FILTER (WHERE status = 'Completado'), 0) AS contribution,
              COALESCE(SUM(cash_receipts) FILTER (WHERE status = 'Completado'), 0) AS cash_receipts,
              COALESCE(SUM(credit_receipts) FILTER (WHERE status = 'Completado'), 0) AS credit_receipts,
              COALESCE(SUM(quantity) FILTER (WHERE status = 'Completado'), 0) AS services
       FROM sales_calculated
       WHERE sale_date >= make_date($1, 1, 1) AND sale_date < make_date($1 + 1, 1, 1)
       GROUP BY month_number`,
      [year]
    ),
    pool.query(
      `SELECT period AS month, COALESCE(SUM(budgeted_direct_cost), 0) AS total
       FROM service_costs_calculated
       WHERE period = ANY($1::text[])
       GROUP BY period`,
      [months]
    ),
    pool.query(
      `SELECT month,
              COALESCE(SUM(monthly_equivalent), 0) AS total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE expense_type = 'Fijo'), 0) AS fixed_total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE category = 'Comercial'), 0) AS commercial_total,
              COALESCE(SUM(monthly_equivalent) FILTER (WHERE category <> 'Comercial'), 0) AS administrative_total
       FROM expenses_calculated
       GROUP BY month`
    ),
    pool.query(
      `SELECT COALESCE(SUM(total_employer_cost), 0) AS total,
              COALESCE(SUM(estimated_net), 0) AS payroll_net,
              COALESCE(SUM(employer_health + employer_pension + employer_arl
                + family_compensation + sena + icbf), 0) AS employer_contributions
       FROM payroll_calculated`
    ),
    pool.query(
      `SELECT id, transaction_date, transaction_type, amount, annual_interest_rate,
              term_months, monthly_payment, monthly_depreciation
       FROM investments_financing_calculated`
    )
  ]);
}

export function rowsByMonth(rows) {
  const map = new Map(rows.map((row) => [row.month, Number(row.total)]));
  return months.map((month) => map.get(month) || 0);
}

export async function breakEvenReport(data) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(net_revenue), 0) AS revenue,
            COALESCE(SUM(total_direct_cost), 0) AS direct_cost,
            COALESCE(SUM(quantity), 0) AS services,
            COALESCE(SUM(contribution_margin), 0) AS contribution
     FROM sales_calculated
     WHERE company_id = $2 AND status = 'Completado'
       AND sale_date >= make_date($1, 1, 1) AND sale_date < make_date($1 + 1, 1, 1)`,
    [data.year, data.companyId]
  );
  const totals = result.rows[0];
  const meanMonthlyPayroll = data.payroll[0];
  const fixedExpenses = data.fixedExpenses.reduce((sum, value) => sum + value, 0) / 12;
  const fixedCosts = fixedExpenses + meanMonthlyPayroll;
  const services = Number(totals.services);
  const contributionPerService = services > 0 ? Number(totals.contribution) / services : null;
  const breakEvenServices = contributionPerService && contributionPerService > 0
    ? Math.ceil(fixedCosts / contributionPerService)
    : null;
  return {
    configured: true,
    year: data.year,
    fixedCosts,
    averageRevenuePerService: services > 0 ? Number(totals.revenue) / services : null,
    averageDirectCostPerService: services > 0 ? Number(totals.direct_cost) / services : null,
    contributionPerService,
    breakEvenServices,
    monthlyBreakEvenRevenue: breakEvenServices === null || !contributionPerService
      ? null
      : breakEvenServices * Number(totals.revenue) / services
  };
}

export async function reportData(companyId) {
  const settings = await pool.query('SELECT * FROM company_settings WHERE company_id = $1', [companyId]);
  if (!settings.rowCount) return { configured: false };
  const config = settings.rows[0];
  config.company_id = companyId;
  const [sales, costs, expenses, payroll, investments] = await buildMonthlyReports(config.fiscal_year);
  const revenue = Array(12).fill(0);
  const salesDirectCost = Array(12).fill(0);
  const contribution = Array(12).fill(0);
  const cashReceipts = Array(12).fill(0);
  const creditReceipts = Array(12).fill(0);
  const services = Array(12).fill(0);
  for (const row of sales.rows) {
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
  const payrollTotal = Number(payroll.rows[0].total);
  const payrollNet = Number(payroll.rows[0].payroll_net);
  const employerContributions = Number(payroll.rows[0].employer_contributions);
  const investmentSummary = {};
  const financingInflows = Array(12).fill(0);
  const investmentOutflows = Array(12).fill(0);
  const financingPayments = Array(12).fill(0);
  let monthlyDepreciation = 0;
  let monthlyFinanceExpense = 0;
  for (const row of investments.rows) {
    const transactionDate = String(row.transaction_date).slice(0, 10);
    const transactionYear = Number(transactionDate.slice(0, 4));
    const startMonth = Number(transactionDate.slice(5, 7)) - 1;
    const amount = Number(row.amount);
    monthlyDepreciation += Number(row.monthly_depreciation);
    monthlyFinanceExpense += amount * Number(row.annual_interest_rate) / 12;
    if (transactionYear === Number(config.fiscal_year)) {
      investmentSummary[row.transaction_type] = (investmentSummary[row.transaction_type] || 0) + amount;
      if (row.transaction_type === 'Financiación' || row.transaction_type === 'Aporte socio') {
        financingInflows[startMonth] += amount;
      } else {
        investmentOutflows[startMonth] += amount;
      }
    }
    if (row.transaction_type === 'Financiación' && Number(row.monthly_payment) > 0 && Number(row.term_months) > 0) {
      for (let installment = 0; installment < Number(row.term_months); installment += 1) {
        const monthIndex = (transactionYear - Number(config.fiscal_year)) * 12 + startMonth + installment;
        if (monthIndex >= 0 && monthIndex < 12) financingPayments[monthIndex] += Number(row.monthly_payment);
      }
    }
  }
  const monthlyEbitda = revenue.map((amount, index) =>
    amount - salesDirectCost[index] - commercialExpenses[index] - administrativeExpenses[index] - payrollTotal
  );
  const monthlyOperatingProfit = monthlyEbitda.map((amount) => amount - monthlyDepreciation);
  const monthlyFinanceExpenses = Array(12).fill(monthlyFinanceExpense);
  const monthlyProfitBeforeTax = monthlyOperatingProfit.map((amount, index) => amount - monthlyFinanceExpenses[index]);
  const monthlyTax = monthlyProfitBeforeTax.map((amount) => Math.max(0, amount) * Number(config.income_tax_rate));
  const monthlyNetProfit = monthlyProfitBeforeTax.map((amount, index) => amount - monthlyTax[index]);
  const monthlyPayrollCash = payrollNet + employerContributions;
  const monthlyOutflow = salesDirectCost.map((amount, index) =>
    amount + monthlyExpenses[index] + monthlyPayrollCash + investmentOutflows[index] + financingPayments[index]
  );
  const monthlyNetCashFlow = monthlyOutflow.map((amount, index) =>
    cashReceipts[index] + creditReceipts[index] + financingInflows[index] - amount - monthlyTax[index]
  );
  const startingCash = Number(config.opening_cash);
  const endingCash = [];
  let cash = startingCash;
  for (let index = 0; index < 12; index += 1) {
    cash += monthlyNetCashFlow[index];
    endingCash.push(cash);
  }
  const average = (values, start = 0, end = 3) => values.slice(start, end).reduce((sum, value) => sum + value, 0) / (end - start);
  const growthMonthly = (rate) => Math.pow(1 + Number(rate), 1 / 12) - 1;
  const renderForecastLabel = (monthIndex, yearOffset) => {
    const monthName = months[monthIndex % 12];
    const year = Number(config.fiscal_year) + yearOffset;
    return `${monthName} ${year}`;
  };
  const forecast = [];
  const revenueGrowth = Number(config.monthly_sales_growth);
  const directGrowth = growthMonthly(config.annual_direct_cost_growth);
  const expenseGrowth = growthMonthly(config.annual_expense_growth);
  const baseRevenue = average(revenue);
  const baseDirectCost = average(salesDirectCost);
  const baseCommercialExpense = average(commercialExpenses);
  const baseAdministrativeExpense = average(administrativeExpenses);
  const firstQuarterRevenue = revenue.slice(0, 3).reduce((sum, value) => sum + value, 0);
  const cashCollectionRate = firstQuarterRevenue > 0
    ? cashReceipts.slice(0, 3).reduce((sum, value) => sum + value, 0) / firstQuarterRevenue
    : 0;
  const forecastMonths = 36;
  for (let index = 0; index < forecastMonths; index += 1) {
    const step = index + 1;
    const monthIndex = (3 + index) % 12;
    const yearOffset = Math.floor((3 + index) / 12);
    const projectedRevenue = baseRevenue * Math.pow(1 + revenueGrowth, step);
    const projectedDirectCost = baseDirectCost * Math.pow(1 + directGrowth, step);
    const projectedCommercialExpense = baseCommercialExpense * Math.pow(1 + expenseGrowth, step);
    const projectedAdministrativeExpense = baseAdministrativeExpense * Math.pow(1 + expenseGrowth, step);
    const projectedExpenses = projectedCommercialExpense + projectedAdministrativeExpense;
    const projectedEbitda = projectedRevenue - projectedDirectCost - projectedExpenses - payrollTotal;
    const projectedOperatingProfit = projectedEbitda - monthlyDepreciation;
    const projectedFinanceExpense = monthlyFinanceExpense;
    const projectedProfitBeforeTax = projectedOperatingProfit - projectedFinanceExpense;
    const projectedIncomeTax = Math.max(0, projectedProfitBeforeTax) * Number(config.income_tax_rate);
    const previousRevenue = index === 0 ? baseRevenue : forecast[index - 1].revenue;
    const customerReceipts = projectedRevenue * cashCollectionRate + previousRevenue * (1 - cashCollectionRate);
    forecast.push({
      month: renderForecastLabel(monthIndex, yearOffset),
      revenue: projectedRevenue,
      directCost: projectedDirectCost,
      commercialExpenses: projectedCommercialExpense,
      administrativeExpenses: projectedAdministrativeExpense,
      expenses: projectedExpenses,
      payroll: payrollTotal,
      ebitda: projectedEbitda,
      depreciation: monthlyDepreciation,
      operatingProfit: projectedOperatingProfit,
      financeExpense: projectedFinanceExpense,
      profitBeforeTax: projectedProfitBeforeTax,
      incomeTax: projectedIncomeTax,
      netProfit: projectedProfitBeforeTax - projectedIncomeTax,
      netMargin: projectedRevenue === 0 ? null : (projectedProfitBeforeTax - projectedIncomeTax) / projectedRevenue,
      customerReceipts,
      financingInflows: 0,
      directCostPayments: projectedDirectCost,
      payrollNet,
      employerContributions,
      investmentPayments: 0,
      financingPayments: financingPayments[monthIndex]
    });
  }
  const projectedTaxPayments = forecast.reduce((sum, row) => sum + row.incomeTax, 0);
  const decemberProjectionCount = forecast.filter((row) => row.month.includes('Diciembre')).length || 1;
  let projectedCash = endingCash[2];
  for (const row of forecast) {
    const monthName = row.month.split(' ')[0];
    row.taxPayment = monthName === 'Diciembre' ? projectedTaxPayments / decemberProjectionCount : 0;
    const payments = row.directCostPayments + row.payrollNet + row.employerContributions
      + row.commercialExpenses + row.administrativeExpenses + row.taxPayment
      + row.investmentPayments + row.financingPayments;
    row.netCashFlow = row.customerReceipts + row.financingInflows - payments;
    projectedCash += row.netCashFlow;
    row.endingCash = projectedCash;
  }
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
    payroll: Array(12).fill(payrollTotal),
    payrollNet,
    employerContributions,
    ebitda: monthlyEbitda,
    depreciation: Array(12).fill(monthlyDepreciation),
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
    cashCollectionRate,
    forecastStartingCash: endingCash[2],
    forecastEndingCash: forecast.at(-1)?.endingCash ?? endingCash[2],
    openingCash: startingCash,
    minimumCashReserve: Number(config.minimum_cash_reserve),
    targetNetMargin: Number(config.target_net_margin),
    scenario: config.scenario,
    costPerHour: payrollTotal / (Number(config.monthly_billable_hours_per_professional) * Number(config.professional_count)),
    vatRate: Number(config.vat_rate),
    incomeTaxRate: Number(config.income_tax_rate),
    investmentSummary
  };
}
