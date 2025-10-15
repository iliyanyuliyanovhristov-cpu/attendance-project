/*
  Warnings:

  - You are about to drop the column `role` on the `CompanyUser` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - Made the column `recordedBy` on table `AttendanceLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "EquipmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "deviceId" TEXT,
    "name" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EquipmentLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EquipmentLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AttendanceLog" ("action", "companyId", "employeeId", "id", "recordedBy", "timestamp") SELECT "action", "companyId", "employeeId", "id", "recordedBy", "timestamp" FROM "AttendanceLog";
DROP TABLE "AttendanceLog";
ALTER TABLE "new_AttendanceLog" RENAME TO "AttendanceLog";
CREATE TABLE "new_CompanyUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CompanyUser" ("companyId", "id", "userId") SELECT "companyId", "id", "userId" FROM "CompanyUser";
DROP TABLE "CompanyUser";
ALTER TABLE "new_CompanyUser" RENAME TO "CompanyUser";
CREATE UNIQUE INDEX "CompanyUser_userId_companyId_key" ON "CompanyUser"("userId", "companyId");
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tabletNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerUserId" TEXT,
    CONSTRAINT "Device_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Device_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Device" ("apiKey", "companyId", "id", "lastSeen", "passwordHash", "tabletNumber") SELECT "apiKey", "companyId", "id", "lastSeen", "passwordHash", "tabletNumber" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_apiKey_key" ON "Device"("apiKey");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "fullName" TEXT
);
INSERT INTO "new_User" ("email", "fullName", "id", "passwordHash", "role") SELECT "email", "fullName", "id", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EquipmentLog_companyId_timestamp_idx" ON "EquipmentLog"("companyId", "timestamp");
