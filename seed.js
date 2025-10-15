// seed.js  — PostgreSQL için güncel seed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding…');

  // 1) Kullanıcılar
  const superAdmin = await prisma.user.upsert({
    where: { email: 'sen@admin.local' },
    update: {},
    create: {
      fullName: 'Süper Admin',
      email: 'sen@admin.local',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      role: 'SUPER_ADMIN',
    },
  });

  const ahmetAdmin = await prisma.user.upsert({
    where: { email: 'ahmet@acme.local' },
    update: {},
    create: {
      fullName: 'Ahmet Yılmaz',
      email: 'ahmet@acme.local',
      passwordHash: await bcrypt.hash('Ahmet123!', 10),
      role: 'COMPANY_ADMIN', // rol User tablosunda
    },
  });

  // 2) Şirket
  const company = await prisma.company.upsert({
    where: { name: 'Sirket 1' },
    update: {},
    create: { name: 'Sirket 1' },
  });

  // 3) CompanyUser bağlantıları (BU TABLODA role yok!)
  // sadece userId + companyId ilişkilendiriyoruz
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: { userId: ahmetAdmin.id, companyId: company.id },
    },
    update: {},
    create: { userId: ahmetAdmin.id, companyId: company.id },
  });

  // İsterseniz süper admin’i de ilişkilendirebilirsiniz (opsiyonel)
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: { userId: superAdmin.id, companyId: company.id },
    },
    update: {},
    create: { userId: superAdmin.id, companyId: company.id },
  });

  // 4) Çalışanlar
  const mehmet = await prisma.employee.upsert({
    where: { id: 'seed-mehmet' },
    update: { isActive: true },
    create: {
      id: 'seed-mehmet',
      companyId: company.id,
      firstName: 'Mehmet',
      lastName: 'Kaya',
      isActive: true,
    },
  });

  const ahmet = await prisma.employee.upsert({
    where: { id: 'seed-ahmet' },
    update: { isActive: true },
    create: {
      id: 'seed-ahmet',
      companyId: company.id,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      isActive: true,
    },
  });

  // 5) Cihaz (Tablet)
  const device = await prisma.device.upsert({
    where: {
      // benzersiz alanınız tabletNumber + companyId birleşimi ise findFirst/ upsert farklı kurulur;
      // biz burada apiKey üzerinden garantiye alacağız:
      apiKey: 'seed-device-apikey-001',
    },
    update: {},
    create: {
      companyId: company.id,
      tabletNumber: 'T1',
      passwordHash: await bcrypt.hash('Tablet123!', 10),
      apiKey: 'seed-device-apikey-001',
      lastSeen: new Date(),
    },
  });

  // 6) Örnek giriş/çıkış logları
  const now = new Date();
  const aFew = (mins) => new Date(now.getTime() - mins * 60 * 1000);

  await prisma.attendanceLog.createMany({
    data: [
      {
        employeeId: mehmet.id,
        companyId: company.id,
        action: 'IN',
        recordedBy: 'seed',
        timestamp: aFew(60),
      },
      {
        employeeId: mehmet.id,
        companyId: company.id,
        action: 'OUT',
        recordedBy: 'seed',
        timestamp: aFew(45),
      },
      {
        employeeId: ahmet.id,
        companyId: company.id,
        action: 'IN',
        recordedBy: 'seed',
        timestamp: aFew(30),
      },
      {
        employeeId: ahmet.id,
        companyId: company.id,
        action: 'OUT',
        recordedBy: 'seed',
        timestamp: aFew(15),
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed tamamlandı:');
  console.log({
    superAdmin: superAdmin.email,
    company: company.name,
    companyAdmin: ahmetAdmin.email,
    deviceApiKey: device.apiKey,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
