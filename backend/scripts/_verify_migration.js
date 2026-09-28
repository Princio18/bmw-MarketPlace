const { Pool } = require('pg');
const p = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'cio123', database: 'bmwautosell' });

(async () => {
  const roles = await p.query('SELECT name FROM roles ORDER BY id');
  console.log('roles:', roles.rows.map((r) => r.name).join(', '));

  const cols = await p.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name IN ('vendor_id','created_by') ORDER BY column_name",
  );
  console.log('vehicles cols (vendor_id/created_by):', cols.rows.map((r) => r.column_name).join(', ') || '(none)');

  const vendeurs = await p.query("SELECT count(*)::int AS n FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'vendeur')");
  console.log('vendeur users:', vendeurs.rows[0].n);

  const admins = await p.query("SELECT id, email FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')");
  console.log('admins:', admins.rows.map((r) => r.email).join(', '));

  const vehicles = await p.query('SELECT count(*)::int AS n FROM vehicles');
  const active = await p.query('SELECT count(*)::int AS n FROM vehicles WHERE deleted_at IS NULL');
  const createdBy = await p.query('SELECT count(*)::int AS n FROM vehicles WHERE created_by IS NOT NULL');
  console.log(`vehicles: total=${vehicles.rows[0].n} active=${active.rows[0].n} with created_by=${createdBy.rows[0].n}`);

  await p.end();
})().catch((e) => { console.error(e.message); process.exit(1); });