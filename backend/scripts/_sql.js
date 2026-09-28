const { Pool } = require('pg');
const p = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'cio123', database: 'bmwautosell' });
const SQL = process.argv[2];
p.query(SQL).then((r) => { console.log('OK rows:', r.rowCount); return p.end(); })
  .catch((e) => { console.error(e.message); process.exit(1); });