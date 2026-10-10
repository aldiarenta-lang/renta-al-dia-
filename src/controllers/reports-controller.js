import { databaseError } from '../middlewares/validation.js';
import { breakEvenReport, reportData } from '../services/report-service.js';

export async function getReport(req, res) {
  try {
    const data = await reportData(req.operator.companyId);
    if (!data.configured) return res.json({ configured: false });
    if (req.params.name === 'dashboard' || req.params.name === 'summary') {
      const actualRevenue = data.historicalRevenue;
      const actualProfit = data.operatingProfit.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const forecastRevenue = data.forecast.reduce((sum, row) => sum + row.revenue, 0);
      const forecastProfit = data.forecast.reduce((sum, row) => sum + row.netProfit, 0);
      const actualNetProfit = data.netProfit.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const completedServices = data.services.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const totalInvestments = Object.entries(data.investmentSummary)
        .filter(([type]) => type.startsWith('Activo'))
        .reduce((sum, [, value]) => sum + value, 0);
      const totalFinancing = (data.investmentSummary.Financiación || 0) + (data.investmentSummary['Aporte socio'] || 0);
      return res.json({
        configured: true, year: data.year, actualRevenue, actualProfit, forecastRevenue, forecastProfit,
        projectedRevenue: actualRevenue + forecastRevenue,
        projectedNetMargin: actualRevenue + forecastRevenue === 0 ? null : (actualNetProfit + forecastProfit) / (actualRevenue + forecastRevenue),
        completedServices, endingCash: data.forecastEndingCash, actualEndingCash: data.endingCash[5],
        totalInvestments, totalFinancing,
        minimumCashReserve: data.minimumCashReserve, targetNetMargin: data.targetNetMargin,
        scenario: data.scenario, costPerHour: data.costPerHour,
        months: data.historicalMonths,
        quarterlyRevenue: data.revenue.slice(0, 6),
        quarterlyProfit: data.operatingProfit.slice(0, 6),
        quarterlyCash: data.endingCash.slice(0, 6),
        quarterlyNetCashFlow: data.netCashFlow.slice(0, 6),
        strategicIndicators: data.strategicIndicators,
        forecastSeries: data.forecast.map(({ month, revenue, netProfit, endingCash }) => ({
          month, revenue, netProfit, endingCash
        })),
        years: data.years.map(({ year, revenue, netProfit, netMargin, endingCash, comparison }) => ({
          year, revenue, netProfit, netMargin, endingCash, comparison
        }))
      });
    }
    if (req.params.name === 'results') {
      return res.json({
        configured: true, year: data.year, months: data.historicalMonths,
        rows: [
          { label: 'Ventas netas', values: data.revenue.slice(0, 6) },
          { label: 'Costos directos de ventas', values: data.salesDirectCost.slice(0, 6) },
          { label: 'Margen de contribución', values: data.contribution.slice(0, 6) },
          { label: 'Gastos comerciales y captación', values: data.commercialExpenses.slice(0, 6) },
          { label: 'Gastos administrativos y tecnológicos', values: data.administrativeExpenses.slice(0, 6) },
          { label: 'Nómina — costo empleador', values: data.payroll.slice(0, 6) },
          { label: 'Resultado operativo antes de depreciación', values: data.ebitda.slice(0, 6) },
          { label: 'Depreciación y amortización', values: data.depreciation.slice(0, 6) },
          { label: 'Resultado operativo', values: data.operatingProfit.slice(0, 6) },
          { label: 'Gastos financieros estimados', values: data.financeExpenses.slice(0, 6) },
          { label: 'Utilidad antes de impuestos', values: data.profitBeforeTax.slice(0, 6) },
          { label: 'Impuesto de renta estimado', values: data.incomeTax.slice(0, 6) },
          { label: 'Utilidad neta', values: data.netProfit.slice(0, 6) }
        ]
      });
    }
    if (req.params.name === 'cashflow') {
      return res.json({
        configured: true, year: data.year, months: data.historicalMonths, openingCash: data.openingCash,
        customerReceipts: data.cashReceipts.slice(0, 6).map((amount, index) => amount + data.creditReceipts[index]),
        financingInflows: data.financingInflows.slice(0, 6),
        directCostPayments: data.salesDirectCost.slice(0, 6),
        payrollNet: Array(6).fill(data.payrollNet),
        employerContributions: Array(6).fill(data.employerContributions),
        operatingExpenses: data.expenses.slice(0, 6),
        taxes: data.actualTaxPayments.slice(0, 6),
        investmentPayments: data.investmentOutflows.slice(0, 6),
        financingPayments: data.financingPayments.slice(0, 6),
        netCashFlow: data.historicalNetCashFlow,
        endingCash: data.historicalEndingCash,
        forecastStartingCash: data.forecastStartingCash,
        forecast: data.forecast,
        years: data.years
      });
    }
    if (req.params.name === 'forecast') {
      return res.json({
        configured: true, year: data.year, rows: data.forecast, years: data.years,
        startingCash: data.forecastStartingCash, endingCash: data.forecastEndingCash,
        scenarioSummaries: data.scenarioSummaries,
        strategicIndicators: data.strategicIndicators
      });
    }
    if (req.params.name === 'scenarios') {
      return res.json({ configured: true, scenarios: data.scenarioSummaries });
    }
    if (req.params.name === 'balance-projected') {
      return res.json({
        configured: true, years: data.years.map(({ year, balance }) => ({ year, balance }))
      });
    }
    if (req.params.name === 'indicators') {
      return res.json({ configured: true, indicators: data.strategicIndicators });
    }
    if (req.params.name === 'horizontal') {
      return res.json({
        configured: true,
        years: data.years.map(({ year, revenue, grossProfit, ebitda, operatingProfit, netProfit, comparison }) => ({
          year, revenue, grossProfit, ebitda, operatingProfit, netProfit, comparison
        }))
      });
    }
    if (req.params.name === 'vertical') {
      return res.json({
        configured: true,
        years: data.years.map(({ year, revenue, directCost, grossProfit, commercialExpenses, administrativeExpenses, ebitda, operatingProfit, netProfit }) => ({
          year,
          rows: [
            { label: 'Ventas netas', amount: revenue, ratio: revenue > 0 ? 1 : null },
            ...[
              ['Costos directos', directCost],
              ['Utilidad bruta', grossProfit],
              ['Gastos comerciales', commercialExpenses],
              ['Gastos administrativos', administrativeExpenses],
              ['EBITDA', ebitda],
              ['Resultado operacional', operatingProfit],
              ['Utilidad neta', netProfit]
            ].map(([label, amount]) => ({ label, amount, ratio: revenue > 0 ? amount / revenue : null }))
          ]
        }))
      });
    }
    if (req.params.name === 'results-projected') {
      return res.json({
        configured: true,
        years: data.years.map(({ year, rows, ...annual }) => ({ year, ...annual }))
      });
    }
    if (req.params.name === 'cashflow-projected') {
      return res.json({
        configured: true,
        years: data.years.map(({ year, rows }) => ({
          year,
          rows: rows.map(({ month, revenue, customerReceipts, financingInflows, directCostPayments, payrollNet, employerContributions, expenses, taxPayment, investmentPayments, financingPayments, netCashFlow, endingCash }) => ({
            month, revenue, customerReceipts, financingInflows, directCostPayments, payrollNet,
            employerContributions, expenses, taxPayment, investmentPayments, financingPayments,
            netCashFlow, endingCash
          }))
        }))
      });
    }
    if (req.params.name === 'taxes') {
      return res.json({
        configured: true, year: data.year, months: data.historicalMonths, revenue: data.revenue.slice(0, 6),
        vatBase: data.revenue.slice(0, 6), vatEstimate: data.revenue.slice(0, 6).map((amount) => amount * data.vatRate),
        incomeTaxBase: data.profitBeforeTax.slice(0, 6).map((amount) => Math.max(0, amount)),
        incomeTaxEstimate: data.incomeTax.slice(0, 6),
        vatRate: data.vatRate, incomeTaxRate: data.incomeTaxRate
      });
    }
    if (req.params.name === 'break-even') return res.json(await breakEvenReport(data));
    return res.status(404).json({ error: 'El informe solicitado no existe.' });
  } catch (error) {
    return databaseError(error, res);
  }
}
