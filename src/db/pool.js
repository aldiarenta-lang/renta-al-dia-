import { Pool } from 'pg';

const postgres = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});
let operatorCompanyId = null;

export const pool = {
  setOperatorCompanyId(companyId) {
    operatorCompanyId = companyId;
  },
  getOperatorCompanyId() {
    return operatorCompanyId;
  },
  connect: () => postgres.connect(),
  end: () => postgres.end(),
  privilegedQuery: (statement, values) => postgres.query(statement, values),
  query: (statement, values) => postgres.query(statement, values)
};
