import { databaseError } from '../middlewares/validation.js';
import { breakEvenReport, reportData } from '../services/report-service.js';

export async function getReport(req, res) {
  try {
    const data = await reportData(req.operator.companyId);
    if (!data.configured) return res.json({ configured: false });
    if (req.params.name === 'dashboard' || req.params.name === 'summary') {
      const actualRevenue = data.revenue.slice(0, 3).reduce((sum, value) => sum + value, 0);
      const actualProfit = data.operatingProfit.slice(0, 3).reduce((sum, value) => sum + value, 0);
      const forecastRevenue = data.forecast.reduce((sum, row) => sum + row.revenue, 0);
      const forecastProfit = data.forecast.reduce((sum, row) => sum + row.netProfit, 0);
      const actualNetProfit = data.netProfit.slice(0, 3).reduce((sum, value) => sum + value, 0);
      const completedServices = data.services.slice(0, 3).reduce((sum, value) => sum + value, 0);
      const totalInvestments = Object.entries(data.investmentSummary)
        .filter(([type]) => type.startsWith('Activo'))
        .reduce((sum, [, value]) => sum + value, 0);
      const totalFinancing = (data.investmentSummary.Financiación || 0) + (data.investmentSummary['Aporte socio'] || 0);
      return res.json({
        configured: true, year: data.year, actualRevenue, actualProfit, forecastRevenue, forecastProfit,
        projectedRevenue: actualRevenue + forecastRevenue,
        projectedNetMargin: actualRevenue + forecastRevenue === 0 ? null : (actualNetProfit + forecastProfit) / (actualRevenue + forecastRevenue),
        completedServices, endingCash: data.forecastEndingCash, actualEndingCash: data.endingCash[2],
        totalInvestments, totalFinancing,
        minimumCashReserve: data.minimumCashReserve, targetNetMargin: data.targetNetMargin,
        scenario: data.scenario, costPerHour: data.costPerHour,
        months: data.months.slice(0, 3),
        quarterlyRevenue: data.revenue.slice(0, 3),
        quarterlyProfit: data.operatingProfit.slice(0, 3),
        quarterlyCash: data.endingCash.slice(0, 3),
        quarterlyNetCashFlow: data.netCashFlow.slice(0, 3)
      });
    }
    if (req.params.name === 'results') {
      return res.json({
        configured: true, year: data.year, months: data.months,
        rows: [
          { label: 'Ventas netas', values: data.revenue },
          { label: 'Costos directos de ventas', values: data.salesDirectCost },
          { label: 'Margen de contribución', values: data.contribution },
          { label: 'Gastos comerciales y captación', values: data.commercialExpenses },
          { label: 'Gastos administrativos y tecnológicos', values: data.administrativeExpenses },
          { label: 'Nómina — costo empleador', values: data.payroll },
          { label: 'Resultado operativo antes de depreciación', values: data.ebitda },
          { label: 'Depreciación y amortización', values: data.depreciation },
          { label: 'Resultado operativo', values: data.operatingProfit },
          { label: 'Gastos financieros estimados', values: data.financeExpenses },
          { label: 'Utilidad antes de impuestos', values: data.profitBeforeTax },
          { label: 'Impuesto de renta estimado', values: data.incomeTax },
          { label: 'Utilidad neta', values: data.netProfit }
        ]
      });
    }
    if (req.params.name === 'cashflow') {
      return res.json({
        configured: true, year: data.year, months: data.months, openingCash: data.openingCash,
        customerReceipts: data.cashReceipts.map((amount, index) => amount + data.creditReceipts[index]),
        financingInflows: data.financingInflows,
        directCostPayments: data.salesDirectCost,
        payrollNet: Array(12).fill(data.payrollNet),
        employerContributions: Array(12).fill(data.employerContributions),
        operatingExpenses: data.expenses,
        taxes: data.incomeTax,
        investmentPayments: data.investmentOutflows,
        financingPayments: data.financingPayments,
        netCashFlow: data.netCashFlow,
        endingCash: data.endingCash,
        forecastStartingCash: data.forecastStartingCash,
        forecast: data.forecast
      });
    }
    if (req.params.name === 'forecast') {
      return res.json({
        configured: true, year: data.year, rows: data.forecast,
        startingCash: data.forecastStartingCash, endingCash: data.forecastEndingCash
      });
    }
    if (req.params.name === 'taxes') {
      return res.json({
        configured: true, year: data.year, months: data.months, revenue: data.revenue,
        vatBase: data.revenue, vatEstimate: data.revenue.map((amount) => amount * data.vatRate),
        incomeTaxBase: data.profitBeforeTax.map((amount) => Math.max(0, amount)),
        incomeTaxEstimate: data.incomeTax,
        vatRate: data.vatRate, incomeTaxRate: data.incomeTaxRate
      });
    }
    if (req.params.name === 'break-even') return res.json(await breakEvenReport(data));
    return res.status(404).json({ error: 'El informe solicitado no existe.' });
  } catch (error) {
    return databaseError(error, res);
  }
}
