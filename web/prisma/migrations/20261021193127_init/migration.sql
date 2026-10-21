-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "zones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zoneName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "mobility_aids" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "patients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "age" INTEGER,
    "zoneId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dischargedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reid_profiles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "mobilityAidId" INTEGER,
    "isAssisted" BOOLEAN NOT NULL DEFAULT false,
    "embeddingRef" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reid_profiles_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reid_profiles_mobilityAidId_fkey" FOREIGN KEY ("mobilityAidId") REFERENCES "mobility_aids" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "patient_contacts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "mobilityAidId" INTEGER NOT NULL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "prescriptions_mobilityAidId_fkey" FOREIGN KEY ("mobilityAidId") REFERENCES "mobility_aids" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "detections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "personTrackId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "zoneId" INTEGER,
    "patientId" INTEGER,
    "identityConfidence" REAL NOT NULL,
    "mobilityAidId" INTEGER,
    "aidLabel" TEXT NOT NULL,
    "aidConfidence" REAL NOT NULL,
    "modelVersion" TEXT,
    "activityState" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "detections_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "detections_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "detections_mobilityAidId_fkey" FOREIGN KEY ("mobilityAidId") REFERENCES "mobility_aids" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "detectionId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackDeadline" DATETIME,
    "escalatedAt" DATETIME,
    "reminderTriggered" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedById" INTEGER,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "alerts_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "detections" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    CONSTRAINT "notifications_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_reminders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "audio_reminders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audio_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "zones_zoneName_key" ON "zones"("zoneName");

-- CreateIndex
CREATE UNIQUE INDEX "mobility_aids_name_key" ON "mobility_aids"("name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_code_key" ON "patients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patient_contacts_patientId_userId_key" ON "patient_contacts"("patientId", "userId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_validTo_idx" ON "prescriptions"("patientId", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "detections_eventId_key" ON "detections"("eventId");

-- CreateIndex
CREATE INDEX "detections_timestamp_idx" ON "detections"("timestamp");

-- CreateIndex
CREATE INDEX "detections_patientId_timestamp_idx" ON "detections"("patientId", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_status_level_idx" ON "alerts"("status", "level");
