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
      const historicalDirectCost = data.salesDirectCost.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const historicalExpenses = data.expenses.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const historicalPayroll = data.payroll.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const historicalDepreciation = data.depreciation.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const historicalNetProfit = data.netProfit.slice(0, 6).reduce((sum, value) => sum + value, 0);
      const projectedNetProfit = data.forecast.reduce((sum, row) => sum + row.netProfit, 0);
      const forecastNetCashFlows = data.forecast.map((row) => row.netCashFlow);
      const projectedTotal = (field) => data.forecast.reduce((sum, row) => sum + Number(row[field] || 0), 0);
      const finalYear = data.years.at(-1);
      const finalBalance = finalYear?.balance;
      const trace = (formula, inputs, missing = []) => ({ formula, inputs, missing });
      const amountValue = (value) => value === null || value === undefined ? null : Number(value);
      const money = (label, value) => ({ label, value: amountValue(value), format: 'money' });
      const percent = (label, value) => ({ label, value: amountValue(value), format: 'percent' });
      const count = (label, value) => ({ label, value: amountValue(value), format: 'number' });
      const office = data.projectionAssumptions || {};
      const officeCost = Object.entries(office)
        .filter(([key]) => key.startsWith('office'))
        .reduce((sum, [, value]) => sum + value, 0);
      const calculationDetails = {
        actualRevenue: trace(
          'Suma de ingresos netos de ventas completadas entre enero y junio.',
          [money('Ventas enero–junio', actualRevenue)],
          actualRevenue === 0 ? ['No hay ventas completadas en el período histórico.'] : []
        ),
        actualProfit: trace(
          'Ventas netas − costos directos − gastos operativos − costo empleador de nómina − depreciación.',
          [
            money('Ventas netas', actualRevenue), money('Costos directos', historicalDirectCost),
            money('Gastos operativos registrados', historicalExpenses), money('Nómina empleador', historicalPayroll),
            money('Depreciación', historicalDepreciation), money('Resultado operacional', actualProfit)
          ],
          actualRevenue === 0 ? ['Faltan ventas históricas completadas.'] : []
        ),
        completedServices: trace(
          'Suma de la cantidad de servicios en ventas completadas entre enero y junio.',
          [count('Servicios completados', completedServices)],
          completedServices === 0 ? ['No hay servicios completados registrados.'] : []
        ),
        projectedCash: trace(
          'Caja al cierre de junio + suma de los flujos netos proyectados de julio del Año 1 a diciembre del Año 4.',
          [
            money('Caja al cierre de junio', data.endingCash[5]),
            money('Flujo neto acumulado de 42 meses', forecastNetCashFlows.reduce((sum, value) => sum + value, 0)),
            money('Caja proyectada final', data.forecastEndingCash),
            money('Reserva mínima configurada', data.minimumCashReserve),
            money('Cobros proyectados de clientes', projectedTotal('customerReceipts')),
            money('Ingresos por financiación', projectedTotal('financingInflows')),
            money('Pagos de costos directos', projectedTotal('directCostPayments')),
            money('Pagos de nómina', projectedTotal('payroll')),
            money('Gastos operativos', projectedTotal('expenses')),
            money('Impuestos pagados', projectedTotal('taxPayment')),
            money('Inversiones proyectadas', projectedTotal('investmentPayments')),
            money('Cuotas de créditos', projectedTotal('financingPayments')),
            money('Gastos mensuales de oficina configurados', officeCost),
            money('Nómina empleador actual más auxiliares', data.forecast[0]?.payroll),
            money('Publicidad Año 1', office.advertisingYear1)
          ],
          [
            ...(Number(data.minimumCashReserve) === 0 ? ['La reserva mínima de caja está en cero o no se configuró.'] : []),
            ...(officeCost === 0 ? ['Los gastos de oficina están en cero; completa arriendo y demás rubros en Parámetros.'] : []),
            ...(office.adminSalary === 0 ? ['El salario proyectado de la auxiliar administrativa está en cero.'] : []),
            ...(office.cleaningSalary === 0 ? ['El salario proyectado de servicios generales está en cero.'] : [])
          ]
        ),
        npv: trace(
          'VPN = − inversión inicial + suma de cada flujo de caja libre descontado mensualmente con la tasa de descuento anual.',
          [
            money('Inversión inicial en activos registrada', totalInvestments),
            percent('Tasa de descuento anual', data.discountRate),
            money('Flujos proyectados considerados', forecastNetCashFlows.reduce((sum, value) => sum + value, 0)),
            money('VPN calculado', data.strategicIndicators.npv)
          ],
          totalInvestments === 0 ? ['No hay inversión inicial registrada como activo en el módulo de Inversiones.'] : []
        ),
        irr: trace(
          'Tasa mensual que hace VPN = 0 para inversión inicial y flujos de los 42 meses; se expresa como tasa anual efectiva.',
          [
            money('Inversión inicial', totalInvestments),
            money('Flujo total proyectado', forecastNetCashFlows.reduce((sum, value) => sum + value, 0)),
            percent('TIR anual', data.strategicIndicators.irr)
          ],
          totalInvestments === 0 ? ['Registra la inversión inicial para obtener una TIR significativa.'] : []
        ),
        payback: trace(
          'Primer mes en que los flujos de caja acumulados recuperan la inversión inicial.',
          [
            money('Inversión inicial', totalInvestments),
            money('Flujo proyectado acumulado', forecastNetCashFlows.reduce((sum, value) => sum + value, 0)),
            { label: 'Recuperación', value: data.strategicIndicators.paybackMonths, format: 'months' }
          ],
          totalInvestments === 0
            ? ['Registra la inversión inicial para calcular el período de recuperación.']
            : data.strategicIndicators.paybackMonths === null
              ? ['Los flujos no recuperan la inversión dentro del horizonte proyectado.']
              : []
        ),
        ebitda: trace(
          'Ventas − costos directos − gastos comerciales − gastos administrativos − costo empleador de nómina; no incluye depreciación, intereses ni impuestos.',
          [
            money('Ventas enero–junio', actualRevenue), money('Costos directos', historicalDirectCost),
            money('Gastos registrados', historicalExpenses), money('Nómina empleador', historicalPayroll),
            money('EBITDA', data.strategicIndicators.ebitda)
          ],
          actualRevenue === 0 ? ['Faltan ventas completadas del semestre.'] : []
        ),
        roi: trace(
          'Utilidad neta acumulada de los 42 meses proyectados ÷ inversión inicial registrada como activo.',
          [
            money('Utilidad neta proyectada acumulada', projectedNetProfit),
            money('Inversión inicial', totalInvestments),
            percent('ROI', data.strategicIndicators.roi)
          ],
          totalInvestments === 0 ? ['Falta registrar inversión inicial en activos.'] : []
        ),
        roa: trace(
          'Utilidad neta del Año 4 ÷ promedio de activos al inicio y al cierre del Año 4.',
          [
            money('Utilidad neta Año 4', finalYear?.netProfit),
            money('Activos al inicio del horizonte', data.openingAssets),
            money('Activos al cierre del Año 4', finalBalance?.totalAssets),
            percent('ROA', data.strategicIndicators.roa)
          ],
          Number(data.openingAssets) === 0 ? ['Completa los saldos de activos iniciales en Parámetros.'] : []
        ),
        roe: trace(
          'Utilidad neta del Año 4 ÷ promedio del patrimonio al inicio y al cierre del Año 4.',
          [
            money('Utilidad neta Año 4', finalYear?.netProfit),
            money('Patrimonio inicial', data.openingEquity),
            money('Patrimonio al cierre del Año 4', finalBalance?.equity),
            percent('ROE', data.strategicIndicators.roe)
          ],
          Number(data.openingEquity) === 0 ? ['Completa el patrimonio inicial en Parámetros.'] : []
        ),
        grossMargin: trace(
          '(Ventas netas − costos directos) ÷ ventas netas, enero–junio.',
          [
            money('Ventas netas', actualRevenue), money('Costos directos', historicalDirectCost),
            percent('Margen bruto', data.strategicIndicators.grossMargin)
          ],
          actualRevenue === 0 ? ['Faltan ventas históricas completadas.'] : []
        ),
        operatingMargin: trace(
          'Resultado operacional histórico ÷ ventas netas históricas.',
          [
            money('Resultado operacional', actualProfit), money('Ventas netas', actualRevenue),
            percent('Margen operacional', data.strategicIndicators.operatingMargin)
          ],
          actualRevenue === 0 ? ['Faltan ventas históricas completadas.'] : []
        ),
        netMargin: trace(
          'Utilidad neta histórica después del impuesto estimado ÷ ventas netas históricas.',
          [
            money('Utilidad neta', historicalNetProfit), money('Ventas netas', actualRevenue),
            percent('Margen neto', data.strategicIndicators.netMargin)
          ],
          actualRevenue === 0 ? ['Faltan ventas históricas completadas.'] : []
        ),
        currentRatio: trace(
          'Activo corriente proyectado al cierre del Año 4 ÷ pasivo corriente proyectado.',
          [
            money('Activo corriente', finalBalance?.currentAssets),
            money('Pasivo corriente', finalBalance?.currentLiabilities),
            { label: 'Liquidez corriente', value: data.strategicIndicators.currentRatio, format: 'number' }
          ],
          Number(finalBalance?.currentLiabilities) === 0 ? ['El pasivo corriente inicial/configurado o proyectado está en cero.'] : []
        ),
        quickRatio: trace(
          '(Activo corriente − inventario) ÷ pasivo corriente al cierre del Año 4.',
          [
            money('Activo corriente', finalBalance?.currentAssets), money('Inventario', finalBalance?.inventory),
            money('Pasivo corriente', finalBalance?.currentLiabilities),
            { label: 'Prueba ácida', value: data.strategicIndicators.quickRatio, format: 'number' }
          ],
          Number(finalBalance?.currentLiabilities) === 0 ? ['El pasivo corriente está en cero; no se puede dividir.'] : []
        ),
        debtRatio: trace(
          'Pasivos totales ÷ activos totales al cierre del Año 4.',
          [
            money('Pasivos totales', finalBalance?.totalLiabilities), money('Activos totales', finalBalance?.totalAssets),
            percent('Endeudamiento', data.strategicIndicators.debtRatio)
          ],
          Number(finalBalance?.totalAssets) === 0 ? ['Completa los saldos iniciales del balance en Parámetros.'] : []
        ),
        workingCapital: trace(
          'Activo corriente − pasivo corriente al cierre del Año 4.',
          [
            money('Activo corriente', finalBalance?.currentAssets),
            money('Pasivo corriente', finalBalance?.currentLiabilities),
            money('Capital de trabajo', data.strategicIndicators.workingCapital)
          ],
          Number(data.openingAssets) === 0 ? ['Verifica y completa los saldos iniciales del balance en Parámetros.'] : []
        ),
        salesGrowth: trace(
          'Ventas del período ÷ base comparable − 1. Año 2 se compara con el semestre proyectado del Año 1 anualizado.',
          [
            money('Ventas período comparado', data.years[1]?.revenue),
            money('Base comparable', data.years[1]?.comparison.revenueBase),
            percent('Crecimiento anual', data.strategicIndicators.salesGrowth)
          ],
          Number(data.years[1]?.comparison.revenueBase) === 0 ? ['No hay base de ventas comparable.'] : []
        ),
        profitGrowth: trace(
          'Utilidad neta del período ÷ utilidad neta comparable − 1; Año 1 se anualiza para comparar con Año 2.',
          [
            money('Utilidad neta del período', data.years[1]?.netProfit),
            money('Utilidad neta base comparable', data.years[1]?.comparison.profitBase),
            percent('Crecimiento anual', data.strategicIndicators.profitGrowth)
          ],
          Number(data.years[1]?.comparison.profitBase) === 0 ? ['No hay utilidad base comparable distinta de cero.'] : []
        ),
        averageRevenuePerClient: trace(
          'Ventas netas históricas enero–junio ÷ clientes activos registrados.',
          [
            money('Ventas netas históricas', actualRevenue),
            { label: 'Clientes activos', value: Number(data.strategicIndicators.activeClients || 0), format: 'number' },
            money('Ingreso promedio por cliente', data.strategicIndicators.averageRevenuePerClient)
          ],
          Number(data.strategicIndicators.activeClients) === 0 ? ['No hay clientes activos relacionados con ventas completadas.'] : []
        ),
        averageRevenuePerService: trace(
          'Ventas netas históricas enero–junio ÷ cantidad de servicios completados.',
          [
            money('Ventas netas históricas', actualRevenue),
            count('Servicios completados', completedServices),
            money('Ingreso promedio por servicio', data.strategicIndicators.averageRevenuePerService)
          ],
          completedServices === 0 ? ['No hay servicios completados registrados.'] : []
        ),
        projectedRevenue: trace(
          'Ventas netas históricas enero–junio + ingresos netos de los 42 meses proyectados.',
          [
            money('Ventas históricas', actualRevenue), money('Ventas proyectadas', forecastRevenue),
            money('Total en el horizonte', actualRevenue + forecastRevenue)
          ],
          actualRevenue === 0 ? ['No hay base de ventas históricas; revisa registros y supuestos de crecimiento.'] : []
        ),
        totalInvestments: trace(
          'Suma de transacciones clasificadas como activos registradas entre enero y junio.',
          Object.entries(data.investmentSummary)
            .filter(([type]) => type.startsWith('Activo'))
            .map(([type, value]) => money(type, value))
            .concat(money('Inversión inicial total', totalInvestments)),
          totalInvestments === 0 ? ['No hay compras de activos registradas en Inversiones y financiación.'] : []
        ),
        totalFinancing: trace(
          'Suma de financiación recibida y aportes de socios registrados entre enero y junio.',
          [
            money('Financiación', data.investmentSummary.Financiación || 0),
            money('Aportes de socios', data.investmentSummary['Aporte socio'] || 0),
            money('Total financiación y aportes', totalFinancing)
          ],
          totalFinancing === 0 ? ['No hay créditos ni aportes de socios registrados para el semestre.'] : []
        ),
        costPerHour: trace(
          'Costo empleador de nómina registrada ÷ (horas facturables mensuales por profesional × número de profesionales).',
          [
            money('Costo empleador mensual de nómina', data.payroll[0]),
            { label: 'Horas facturables por profesional', value: data.monthlyBillableHoursPerProfessional, format: 'number' },
            count('Profesionales', data.professionalCount),
            money('Costo por hora calculado', data.costPerHour)
          ],
          Number(data.monthlyBillableHoursPerProfessional) <= 0 || Number(data.professionalCount) <= 0
            ? ['Completa horas facturables y número de profesionales en Parámetros.']
            : []
        )
      };
      return res.json({
        configured: true, year: data.year, actualRevenue, actualProfit, forecastRevenue, forecastProfit,
        projectedRevenue: actualRevenue + forecastRevenue,
        projectedNetMargin: actualRevenue + forecastRevenue === 0 ? null : (actualNetProfit + forecastProfit) / (actualRevenue + forecastRevenue),
        completedServices, endingCash: data.forecastEndingCash, actualEndingCash: data.endingCash[5],
        totalInvestments, totalFinancing,
        minimumCashReserve: data.minimumCashReserve, targetNetMargin: data.targetNetMargin,
        scenario: data.scenario, costPerHour: data.costPerHour,
        calculationDetails,
        months: data.historicalMonths,
        quarterlyRevenue: data.revenue.slice(0, 6),
        quarterlyProfit: data.operatingProfit.slice(0, 6),
        quarterlyCash: data.endingCash.slice(0, 6),
        quarterlyNetCashFlow: data.netCashFlow.slice(0, 6),
        strategicIndicators: data.strategicIndicators,
        forecastSeries: data.forecast.map(({ month, revenue, netProfit, endingCash }) => ({
          month, revenue, netProfit, endingCash
        })),
        years: data.years.map(({
          year, revenue, directCost, grossProfit, commercialExpenses, administrativeExpenses,
          ebitda, depreciation, operatingProfit, profitBeforeTax, incomeTax, netProfit, netMargin,
          netCashFlow, endingCash, comparison
        }, index) => ({
          year, revenue, directCost, grossProfit, commercialExpenses, administrativeExpenses,
          ebitda, depreciation, operatingProfit, profitBeforeTax, incomeTax, netProfit,
          netMargin, netCashFlow, endingCash, cashStart: index === 0 ? data.forecastStartingCash : data.years[index - 1].endingCash,
          comparison
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
