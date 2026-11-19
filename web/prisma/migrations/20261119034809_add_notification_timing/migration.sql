-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "trigger" TEXT NOT NULL DEFAULT 'intake',
    CONSTRAINT "notifications_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("alertId", "attempts", "channel", "id", "lastAttemptAt", "status", "userId") SELECT "alertId", "attempts", "channel", "id", "lastAttemptAt", "status", "userId" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
