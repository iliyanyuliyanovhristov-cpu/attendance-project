// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

/* ----------------- Core Middlewares ----------------- */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* ----------------- Helpers ----------------- */
async function deviceAuth(req, res, next) {
  try {
    const apiKey = req.header('x-api-key');
    if (!apiKey) return res.status(401).json({ error: 'x-api-key missing' });

    const device = await prisma.device.findUnique({
      where: { apiKey },
      include: { company: true },
    });
    if (!device) return res.status(401).json({ error: 'invalid apiKey' });

    req.device = device;

    prisma.device
      .update({ where: { id: device.id }, data: { lastSeen: new Date() } })
      .catch(() => {});
    next();
  } catch (e) {
    next(e);
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function authRequired(req, res, next) {
  try {
    const h = req.header('Authorization') || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// SUPER_ADMIN: tüm şirketler; COMPANY_ADMIN: bağlı olduğu şirketler
async function getAllowedCompanyIds(req) {
  if (req?.user?.role === 'SUPER_ADMIN') {
    const all = await prisma.company.findMany({ select: { id: true } });
    return all.map(c => c.id);
  }
  const cus = await prisma.companyUser.findMany({
    where: { userId: req.user.id },
    select: { companyId: true },
  });
  return cus.map(x => x.companyId);
}

async function assertCompanyAccess(req, companyId) {
  const allowed = await getAllowedCompanyIds(req);
  return allowed.includes(companyId);
}

function parseDateParam(val, endOfDay = false) {
  if (!val) return undefined;
  const d = new Date(val);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

// CSV helper — TR Excel için ; ayraç + UTF-8 BOM
function rowsToCSV(rows, delim = ';', addBom = true) {
  const headers = [
    'logId',
    'companyId',
    'employeeId',
    'firstName',
    'lastName',
    'action',
    'timestamp',
    'recordedBy',
  ];
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    const re = new RegExp(`[${delim}"\\n]`);
    if (re.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [];
  lines.push(headers.join(delim));
  for (const r of rows) {
    lines.push([
      esc(r.id),
      esc(r.companyId),
      esc(r.employeeId),
      esc(r.employee?.firstName),
      esc(r.employee?.lastName),
      esc(r.action),
      esc(r.timestamp?.toISOString?.() || r.timestamp),
      esc(r.recordedBy),
    ].join(delim));
  }
  const csv = lines.join('\r\n');
  return addBom ? '\uFEFF' + csv : csv;
}

/* ----------------- Health ----------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ----------------- Auth & Admin bootstrap ----------------- */
app.post('/api/admin/register', async (req, res, next) => {
  try {
    const { name, fullName: fullNameInBody, email, password, role = 'SUPER_ADMIN' } = req.body || {};
    const fullName = fullNameInBody || name;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName (veya name), email, password gerekli' });
    }

    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      const h = req.header('Authorization') || '';
      if (!h.startsWith('Bearer ')) return res.status(403).json({ error: 'Forbidden' });
      const token = h.slice(7);
      const me = jwt.verify(token, process.env.JWT_SECRET);
      if (me.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({
      data: { fullName, email, passwordHash, role },
    });

    res.status(201).json({ id: u.id, email: u.email, role: u.role, fullName: u.fullName });
  } catch (e) { next(e); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, u.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = signToken(u);
    res.json({ token, user: { id: u.id, email: u.email, role: u.role, fullName: u.fullName } });
  } catch (e) { next(e); }
});

app.post('/api/admin/attach-company-admin', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { userId, companyId } = req.body || {};
    if (!userId || !companyId) return res.status(400).json({ error: 'userId, companyId required' });

    await prisma.user.update({ where: { id: userId }, data: { role: 'COMPANY_ADMIN' } });
    await prisma.companyUser.upsert({
      where: { userId_companyId: { userId, companyId } },
      update: {},
      create: { userId, companyId },
    });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ----------------- Company & Employees (companyId tabanlı) ----------------- */
app.get('/api/companies', async (_req, res, next) => {
  try {
    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (e) { next(e); }
});

app.get('/api/companies/:companyId/employees', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const employees = await prisma.employee.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    res.json(employees);
  } catch (e) { next(e); }
});

app.post('/api/companies/:companyId/attendance', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { employeeId, action, recordedBy } = req.body || {};
    if (!employeeId || !action) return res.status(400).json({ error: 'employeeId and action required' });

    const log = await prisma.attendanceLog.create({
      data: {
        employeeId,
        companyId,
        action,
        recordedBy: recordedBy || 'tablet',
      },
    });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

/* ----------------- Device (Tablet) ----------------- */
app.post('/api/devices/register', async (req, res, next) => {
  try {
    const { companyName, tabletNumber, password } = req.body || {};
    if (!companyName || !tabletNumber || !password)
      return res.status(400).json({ error: 'companyName, tabletNumber, password required' });

    const company = await prisma.company.findFirst({ where: { name: companyName } });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    let device = await prisma.device.findFirst({ where: { companyId: company.id, tabletNumber } });

    if (!device) {
      const passwordHash = await bcrypt.hash(password, 10);
      const apiKey = crypto.randomBytes(32).toString('hex');
      device = await prisma.device.create({
        data: { companyId: company.id, tabletNumber, passwordHash, apiKey },
      });
      console.log(`NEW DEVICE -> company:${company.name} tablet:${tabletNumber} apiKey:${device.apiKey.slice(0,8)}...`);
      return res.json({ apiKey: device.apiKey, companyId: company.id });
    }

    const ok = await bcrypt.compare(password, device.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });

    console.log(`DEVICE LOGIN -> company:${company.name} tablet:${tabletNumber}`);
    return res.json({ apiKey: device.apiKey, companyId: company.id });
  } catch (e) { next(e); }
});

app.get('/api/device/employees', deviceAuth, async (req, res, next) => {
  try {
    const companyId = req.device.companyId;
    const employees = await prisma.employee.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    res.json(employees);
  } catch (e) { next(e); }
});

app.post('/api/device/attendance', deviceAuth, async (req, res, next) => {
  try {
    const { employeeId, action } = req.body || {};
    if (!employeeId || !action) return res.status(400).json({ error: 'employeeId and action required' });

    const companyId = req.device.companyId;
    const log = await prisma.attendanceLog.create({
      data: {
        employeeId,
        companyId,
        action,
        recordedBy: `tablet-${req.device.tabletNumber}`,
      },
    });
    res.status(201).json(log);
  } catch (e) { next(e); }
});

/* ----------------- ADMIN UÇLARI (frontend’in beklediği) ----------------- */

// /api/admin/my-devices
app.get('/api/admin/my-devices', authRequired, async (req, res, next) => {
  try {
    const allowed = await getAllowedCompanyIds(req);
    if (allowed.length === 0) return res.json([]);

    const devices = await prisma.device.findMany({
      where: { companyId: { in: allowed } },
      orderBy: [{ tabletNumber: 'asc' }],
      include: { ownerUser: true },
    });

    // frontend tablosu için sadeleştirelim
    const flat = devices.map(d => ({
      id: d.id,
      companyId: d.companyId,
      tabletNumber: d.tabletNumber,
      lastSeen: d.lastSeen,
      ownerUserId: d.ownerUserId,
      ownerUser: d.ownerUser ? { id: d.ownerUser.id, email: d.ownerUser.email } : null,
    }));
    res.json(flat);
  } catch (e) { next(e); }
});

// /api/admin/my-employees
app.get('/api/admin/my-employees', authRequired, async (req, res, next) => {
  try {
    const allowed = await getAllowedCompanyIds(req);
    if (allowed.length === 0) return res.json([]);

    const employees = await prisma.employee.findMany({
      where: { companyId: { in: allowed }, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, companyId: true, firstName: true, lastName: true, isActive: true },
    });

    res.json(employees);
  } catch (e) { next(e); }
});

// /api/admin/attendance-logs?from=YYYY-MM-DD&to=YYYY-MM-DD&employeeId=...
app.get('/api/admin/attendance-logs', authRequired, async (req, res, next) => {
  try {
    const allowed = await getAllowedCompanyIds(req);
    if (allowed.length === 0) return res.json([]);

    const { from, to, employeeId, limit = 500, skip = 0 } = req.query;
    const gte = parseDateParam(from, false);
    const lte = parseDateParam(to, true);

    const where = { companyId: { in: allowed } };
    if (employeeId) where.employeeId = String(employeeId);
    if (gte || lte) where.timestamp = {};
    if (gte) where.timestamp.gte = gte;
    if (lte) where.timestamp.lte = lte;

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: { employee: true },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(skip),
    });

    res.json(logs);
  } catch (e) { next(e); }
});

/* ----------------- Company logs JSON/CSV (mevcut) ----------------- */
app.get('/api/companies/:companyId/logs', authRequired, async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { from, to, employeeId, limit = 200, skip = 0 } = req.query;

    const allowed = await assertCompanyAccess(req, companyId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const gte = parseDateParam(from, false);
    const lte = parseDateParam(to, true);

    const where = { companyId };
    if (employeeId) where.employeeId = employeeId;
    if (gte || lte) where.timestamp = {};
    if (gte) where.timestamp.gte = gte;
    if (lte) where.timestamp.lte = lte;

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: { employee: true },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(skip),
    });

    res.json(logs);
  } catch (e) { next(e); }
});

app.get('/api/companies/:companyId/logs.csv', authRequired, async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { from, to, employeeId } = req.query;

    const sep = typeof req.query.sep === 'string' ? req.query.sep : ';';
    const addBom = req.query.bom === '0' ? false : true;

    const allowed = await assertCompanyAccess(req, companyId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const gte = parseDateParam(from, false);
    const lte = parseDateParam(to, true);

    const where = { companyId };
    if (employeeId) where.employeeId = employeeId;
    if (gte || lte) where.timestamp = {};
    if (gte) where.timestamp.gte = gte;
    if (lte) where.timestamp.lte = lte;

    const rows = await prisma.attendanceLog.findMany({
      where,
      include: { employee: true },
      orderBy: { timestamp: 'desc' },
    });

    const csv = rowsToCSV(rows, sep, addBom);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="logs_${companyId}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

/* ----------------- Error Handler & Start ----------------- */
app.use((err, _req, res, _next) => {
  console.error('ERROR:', err);
  res.status(500).json({ error: 'Internal server error', detail: err?.message || String(err) });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on ${port}`));

process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
