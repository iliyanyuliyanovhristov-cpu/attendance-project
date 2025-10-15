const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Şirket 1
  const c1 = await prisma.company.upsert({
    where: { name: 'Sirket 1' },
    update: {},
    create: { name: 'Sirket 1' },
  });

  // Örnek çalışanlar (id'leri sabitledik)
  await prisma.employee.upsert({
    where: { id: 'seed-mehmet' },
    update: {},
    create: { id: 'seed-mehmet', firstName: 'Mehmet', lastName: 'Kaya', companyId: c1.id },
  });
  await prisma.employee.upsert({
    where: { id: 'seed-ahmet' },
    update: {},
    create: { id: 'seed-ahmet', firstName: 'Ahmet', lastName: 'Yilmaz', companyId: c1.id },
  });

  // SEN: global admin
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'sen@admin.local' },
    update: {},
    create: {
      email: 'sen@admin.local',
      fullName: 'Iliya (Global Admin)',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
    },
  });

  // AHMET: sadece Şirket 1 admini
  const ahmetHash = await bcrypt.hash('Ahmet123!', 10);
  const ahmet = await prisma.user.upsert({
    where: { email: 'ahmet@sirket1.local' },
    update: {},
    create: {
      email: 'ahmet@sirket1.local',
      fullName: 'Ahmet Sirket1 Admin',
      passwordHash: ahmetHash,
      role: 'USER',
    },
  });

  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: ahmet.id, companyId: c1.id } },
    update: { role: 'COMPANY_ADMIN' },
    create: { userId: ahmet.id, companyId: c1.id, role: 'COMPANY_ADMIN' },
  });

  console.log('Seed OK:', { superAdmin: superAdmin.email, ahmet: ahmet.email, company: c1.name });
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
