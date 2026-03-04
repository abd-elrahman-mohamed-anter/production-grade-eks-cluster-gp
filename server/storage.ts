import {
  type User, type InsertUser,
  type Scan, type InsertScan,
  type Vulnerability, type InsertVulnerability,
  type ScheduledScan, type InsertScheduledScan,
  type Settings, type InsertSettings,
  users, scans, vulnerabilities, scheduledScans, settings,
  type Report, type InsertReport, reports
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(googleId: string, email: string, username: string, avatar?: string): Promise<User>;
  updateUserApiKey(id: string, apiKey: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Scans
  getScan(id: string): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  createScan(scan: InsertScan & { userId: string }): Promise<Scan>;
  updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined>;
  deleteScan(id: string): Promise<boolean>;
  getRecentScans(limit: number): Promise<Scan[]>;
  getUserScans(userId: string): Promise<Scan[]>;
  resetActiveScans(): Promise<void>;

  // Vulnerabilities
  getVulnerability(id: string): Promise<Vulnerability | undefined>;
  getVulnerabilitiesByScan(scanId: string): Promise<Vulnerability[]>;
  createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability>;
  deleteVulnerabilitiesByScan(scanId: string): Promise<boolean>;

  // Scheduled Scans
  getScheduledScan(id: string): Promise<ScheduledScan | undefined>;
  getAllScheduledScans(): Promise<ScheduledScan[]>;
  createScheduledScan(schedule: InsertScheduledScan): Promise<ScheduledScan>;
  updateScheduledScan(id: string, updates: Partial<ScheduledScan>): Promise<ScheduledScan | undefined>;
  deleteScheduledScan(id: string): Promise<boolean>;

  // Settings
  getSettings(userId?: string): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(id: string, updates: Partial<Settings>): Promise<Settings | undefined>;

  // Reports
  getReportsByUser(userId: string): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  deleteReport(id: string): Promise<boolean>;

  // Stats
  getStats(): Promise<{ totalScans: number; totalVulnerabilities: number; criticalCount: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private scans: Map<string, Scan>;
  private vulnerabilities: Map<string, Vulnerability>;
  private scheduledScans: Map<string, ScheduledScan>;
  private settings: Map<string, Settings>;
  private reports: Map<string, Report>;

  constructor() {
    this.users = new Map();
    this.scans = new Map();
    this.vulnerabilities = new Map();
    this.scheduledScans = new Map();
    this.settings = new Map();
    this.reports = new Map();

    // Initialize default settings
    const defaultSettings: Settings = {
      id: randomUUID(),
      userId: null,
      scanDepth: "medium",
      autoScan: false,
      emailNotifications: true,
    };
    this.settings.set(defaultSettings.id, defaultSettings);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      username: insertUser.username || null,
      password: insertUser.password || null,
      id,
      apiKey: null,
      googleId: null,
      email: null,
      avatar: null,
    };
    this.users.set(id, user);
    return user;
  }

  async createGoogleUser(googleId: string, email: string, username: string, avatar?: string): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username,
      password: null,
      googleId,
      email,
      avatar: avatar ?? null,
      apiKey: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserApiKey(id: string, apiKey: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      user.apiKey = apiKey;
      this.users.set(id, user);
    }
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = { ...user, ...updates } as User;
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Cascading delete for MemStorage
    const userScans = Array.from(this.scans.values()).filter(s => s.userId === id);
    for (const scan of userScans) {
      await this.deleteVulnerabilitiesByScan(scan.id);
      this.scans.delete(scan.id);
    }

    Array.from(this.scheduledScans.values())
      .filter(s => s.userId === id)
      .forEach(s => this.scheduledScans.delete(s.id));

    Array.from(this.settings.values())
      .filter(s => s.userId === id)
      .forEach(s => this.settings.delete(s.id));

    Array.from(this.reports.values())
      .filter(r => r.userId === id)
      .forEach(r => this.reports.delete(r.id));

    return this.users.delete(id);
  }

  // Scans
  async getScan(id: string): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async getAllScans(): Promise<Scan[]> {
    return Array.from(this.scans.values()).sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createScan(insertScan: InsertScan & { userId: string; apiKeyId?: string }): Promise<Scan> {
    const id = randomUUID();
    const scan: Scan = {
      id,
      userId: insertScan.userId,
      targetUrl: insertScan.targetUrl,
      scanType: insertScan.scanType || "quick",
      status: "pending",
      progress: 0,
      startedAt: null,
      completedAt: null,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
    this.scans.set(id, scan);
    return scan;
  }

  async updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    const scan = this.scans.get(id);
    if (scan) {
      const updated = { ...scan, ...updates };
      this.scans.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteScan(id: string): Promise<boolean> {
    return this.scans.delete(id);
  }

  async getRecentScans(limit: number): Promise<Scan[]> {
    const all = await this.getAllScans();
    return all.slice(0, limit);
  }

  async getUserScans(userId: string): Promise<Scan[]> {
    return Array.from(this.scans.values())
      .filter(scan => scan.userId === userId)
      .sort((a, b) => {
        const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async resetActiveScans(): Promise<void> {
    for (const scan of this.scans.values()) {
      if (scan.status === "running" || scan.status === "pending") {
        const updatedScan: Scan = { ...scan, status: "failed", completedAt: new Date() };
        this.scans.set(scan.id, updatedScan);
      }
    }
  }

  // Vulnerabilities
  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    return this.vulnerabilities.get(id);
  }

  async getVulnerabilitiesByScan(scanId: string): Promise<Vulnerability[]> {
    return Array.from(this.vulnerabilities.values()).filter(
      (v) => v.scanId === scanId
    );
  }

  async createVulnerability(insertVuln: InsertVulnerability): Promise<Vulnerability> {
    const id = randomUUID();
    const vuln: Vulnerability = {
      id,
      scanId: insertVuln.scanId,
      type: insertVuln.type,
      severity: insertVuln.severity,
      title: insertVuln.title,
      description: insertVuln.description,
      affectedUrl: insertVuln.affectedUrl,
      remediation: insertVuln.remediation ?? null,
      details: insertVuln.details ?? null,
    };
    this.vulnerabilities.set(id, vuln);
    return vuln;
  }

  async deleteVulnerabilitiesByScan(scanId: string): Promise<boolean> {
    const toDelete = Array.from(this.vulnerabilities.entries())
      .filter(([_, v]) => v.scanId === scanId)
      .map(([id]) => id);
    toDelete.forEach((id) => this.vulnerabilities.delete(id));
    return true;
  }

  // Scheduled Scans
  async getScheduledScan(id: string): Promise<ScheduledScan | undefined> {
    return this.scheduledScans.get(id);
  }

  async getAllScheduledScans(): Promise<ScheduledScan[]> {
    return Array.from(this.scheduledScans.values());
  }

  async createScheduledScan(insertSchedule: InsertScheduledScan & { userId: string }): Promise<ScheduledScan> {
    const id = randomUUID();
    const schedule: ScheduledScan = {
      id,
      userId: insertSchedule.userId,
      targetUrl: insertSchedule.targetUrl,
      frequency: insertSchedule.frequency,
      time: insertSchedule.time,
      dayOfWeek: insertSchedule.dayOfWeek ?? null,
      dayOfMonth: insertSchedule.dayOfMonth ?? null,
      month: insertSchedule.month ?? null,
      enabled: insertSchedule.enabled ?? true,
      lastRun: null,
      nextRun: null,
    };
    this.scheduledScans.set(id, schedule);
    return schedule;
  }

  async updateScheduledScan(id: string, updates: Partial<ScheduledScan>): Promise<ScheduledScan | undefined> {
    const schedule = this.scheduledScans.get(id);
    if (schedule) {
      const updated = { ...schedule, ...updates };
      this.scheduledScans.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteScheduledScan(id: string): Promise<boolean> {
    return this.scheduledScans.delete(id);
  }

  // Settings
  async getSettings(userId?: string): Promise<Settings | undefined> {
    if (userId) {
      return Array.from(this.settings.values()).find(s => s.userId === userId);
    }
    return Array.from(this.settings.values())[0];
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = randomUUID();
    const settings: Settings = {
      id,
      userId: insertSettings.userId ?? null,
      scanDepth: insertSettings.scanDepth ?? "medium",
      autoScan: insertSettings.autoScan ?? false,
      emailNotifications: insertSettings.emailNotifications ?? true,
    };
    this.settings.set(id, settings);
    return settings;
  }

  async updateSettings(id: string, updates: Partial<Settings>): Promise<Settings | undefined> {
    const settings = this.settings.get(id);
    if (settings) {
      const updated = { ...settings, ...updates };
      this.settings.set(id, updated);
      return updated;
    }
    // Update first settings if id not found
    const first = Array.from(this.settings.values())[0];
    if (first) {
      const updated = { ...first, ...updates };
      this.settings.set(first.id, updated);
      return updated;
    }
    return undefined;
  }

  // Reports
  async getReportsByUser(userId: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(r => r.userId === userId).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      id,
      userId: insertReport.userId,
      scanId: (insertReport as any).scanId ?? null,
      reportName: insertReport.reportName,
      reportPath: insertReport.reportPath,
      createdAt: insertReport.createdAt,
      total: (insertReport as any).total ?? 0,
      critical: (insertReport as any).critical ?? 0,
      high: (insertReport as any).high ?? 0,
      medium: (insertReport as any).medium ?? 0,
      low: (insertReport as any).low ?? 0,
      scanType: (insertReport as any).scanType ?? null,
    } as any;
    this.reports.set(id, report);
    return report;
  }

  async deleteReport(id: string): Promise<boolean> {
    return this.reports.delete(id);
  }

  // Stats
  async getStats(): Promise<{ totalScans: number; totalVulnerabilities: number; criticalCount: number }> {
    const scans = Array.from(this.scans.values());
    const totalScans = scans.length;
    const totalVulnerabilities = scans.reduce((sum, s) => sum + (s.totalVulnerabilities || 0), 0);
    const criticalCount = scans.reduce((sum, s) => sum + (s.criticalCount || 0), 0);
    return { totalScans, totalVulnerabilities, criticalCount };
  }
}

export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private pool: Pool;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is not set. Using in-memory storage instead.");
    }

    // Create PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: dbUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const result = await this.db.insert(users).values({
      id,
      username: insertUser.username,
      password: insertUser.password,
      googleId: null,
      email: null,
      avatar: null,
      apiKey: null,
    }).returning();
    return result[0];
  }

  async createGoogleUser(googleId: string, email: string, username: string, avatar?: string): Promise<User> {
    const id = randomUUID();
    const result = await this.db.insert(users).values({
      id,
      username,
      password: null,
      googleId,
      email,
      avatar: avatar ?? null,
      apiKey: null,
    }).returning();
    return result[0];
  }

  async updateUserApiKey(id: string, apiKey: string): Promise<User | undefined> {
    const result = await this.db.update(users).set({ apiKey }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const toSet: Partial<User> = {};
    if (updates.username !== undefined) toSet.username = updates.username;
    if (updates.password !== undefined) toSet.password = updates.password;
    if (Object.keys(toSet).length === 0) return this.getUser(id);
    const result = await this.db.update(users).set(toSet as any).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      // 1. Get all scan IDs to delete vulnerabilities
      const userScans = await tx.select({ id: scans.id }).from(scans).where(eq(scans.userId, id));
      const scanIds = userScans.map(s => s.id);

      if (scanIds.length > 0) {
        // 2. Delete vulnerabilities
        await tx.delete(vulnerabilities).where(inArray(vulnerabilities.scanId, scanIds));
        // 3. Delete scans
        await tx.delete(scans).where(eq(scans.userId, id));
      }

      // 4. Delete other associated data
      await tx.delete(scheduledScans).where(eq(scheduledScans.userId, id));
      await tx.delete(settings).where(eq(settings.userId, id));
      await tx.delete(reports).where(eq(reports.userId, id));

      // 5. Delete user
      const result = await tx.delete(users).where(eq(users.id, id));
      return true;
    });
  }

  // Scans
  async getScan(id: string): Promise<Scan | undefined> {
    const result = await this.db.select().from(scans).where(eq(scans.id, id)).limit(1);
    return result[0];
  }

  async getAllScans(): Promise<Scan[]> {
    return await this.db.select().from(scans).orderBy(sql`${scans.startedAt} DESC NULLS LAST`);
  }

  async createScan(insertScan: InsertScan & { userId: string }): Promise<Scan> {
    const id = randomUUID();
    const result = await this.db.insert(scans).values({
      id,
      userId: insertScan.userId,
      targetUrl: insertScan.targetUrl,
      scanType: insertScan.scanType || "quick",
      status: "pending",
      startedAt: null,
      completedAt: null,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    }).returning();
    return result[0];
  }

  async updateScan(id: string, updates: Partial<Scan>): Promise<Scan | undefined> {
    const result = await this.db.update(scans).set(updates).where(eq(scans.id, id)).returning();
    return result[0];
  }

  async deleteScan(id: string): Promise<boolean> {
    await this.db.delete(scans).where(eq(scans.id, id));
    return true;
  }

  async getRecentScans(limit: number): Promise<Scan[]> {
    return await this.db.select().from(scans).orderBy(sql`${scans.startedAt} DESC NULLS LAST`).limit(limit);
  }

  async getUserScans(userId: string): Promise<Scan[]> {
    return await this.db.select().from(scans).where(eq(scans.userId, userId)).orderBy(sql`${scans.startedAt} DESC NULLS LAST`);
  }

  async resetActiveScans(): Promise<void> {
    await this.db.update(scans)
      .set({ 
        status: "failed",
        completedAt: new Date()
      })
      .where(inArray(scans.status, ["running", "pending"] as any));
  }

  // Vulnerabilities
  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    const result = await this.db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id)).limit(1);
    return result[0];
  }

  async getVulnerabilitiesByScan(scanId: string): Promise<Vulnerability[]> {
    return await this.db.select().from(vulnerabilities).where(eq(vulnerabilities.scanId, scanId));
  }

  async createVulnerability(insertVuln: InsertVulnerability): Promise<Vulnerability> {
    const id = randomUUID();
    const result = await this.db.insert(vulnerabilities).values({
      id,
      ...insertVuln,
    }).returning();
    return result[0];
  }

  async deleteVulnerabilitiesByScan(scanId: string): Promise<boolean> {
    await this.db.delete(vulnerabilities).where(eq(vulnerabilities.scanId, scanId));
    return true;
  }

  // Scheduled Scans
  async getScheduledScan(id: string): Promise<ScheduledScan | undefined> {
    const result = await this.db.select().from(scheduledScans).where(eq(scheduledScans.id, id)).limit(1);
    return result[0];
  }

  async getAllScheduledScans(): Promise<ScheduledScan[]> {
    return await this.db.select().from(scheduledScans);
  }

  async createScheduledScan(insertSchedule: InsertScheduledScan & { userId: string }): Promise<ScheduledScan> {
    const id = randomUUID();
    const result = await this.db.insert(scheduledScans).values({
      id,
      userId: insertSchedule.userId,
      targetUrl: insertSchedule.targetUrl,
      frequency: insertSchedule.frequency,
      time: insertSchedule.time,
      dayOfWeek: insertSchedule.dayOfWeek ?? null,
      dayOfMonth: insertSchedule.dayOfMonth ?? null,
      month: insertSchedule.month ?? null,
      enabled: insertSchedule.enabled ?? true,
      lastRun: null,
      nextRun: null,
    }).returning();
    return result[0];
  }

  async updateScheduledScan(id: string, updates: Partial<ScheduledScan>): Promise<ScheduledScan | undefined> {
    const result = await this.db.update(scheduledScans).set(updates).where(eq(scheduledScans.id, id)).returning();
    return result[0];
  }

  async deleteScheduledScan(id: string): Promise<boolean> {
    await this.db.delete(scheduledScans).where(eq(scheduledScans.id, id));
    return true;
  }

  // Settings
  async getSettings(userId?: string): Promise<Settings | undefined> {
    if (userId) {
      const result = await this.db.select().from(settings).where(eq(settings.userId, userId)).limit(1);
      if (result.length === 0) {
        // Create default settings for this user if they don't exist
        const id = randomUUID();
        const newSettings = await this.db.insert(settings).values({
          id,
          userId,
          scanDepth: "medium",
          autoScan: false,
          emailNotifications: true,
        }).returning();
        return newSettings[0];
      }
      return result[0];
    }
    const result = await this.db.select().from(settings).limit(1);
    return result[0];
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = randomUUID();
    const result = await this.db.insert(settings).values({
      id,
      userId: insertSettings.userId ?? null,
      scanDepth: insertSettings.scanDepth ?? "medium",
      autoScan: insertSettings.autoScan ?? false,
      emailNotifications: insertSettings.emailNotifications ?? true,
    }).returning();
    return result[0];
  }

  async updateSettings(id: string, updates: Partial<Settings>): Promise<Settings | undefined> {
    const result = await this.db.update(settings).set(updates).where(eq(settings.id, id)).returning();
    return result[0];
  }

  // Reports
  async getReportsByUser(userId: string): Promise<Report[]> {
    return await this.db.select().from(reports).where(eq(reports.userId, userId)).orderBy(sql`${reports.createdAt} DESC NULLS LAST`);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const result = await this.db.insert(reports).values({
      id,
      userId: insertReport.userId,
      scanId: (insertReport as any).scanId ?? null,
      reportName: insertReport.reportName,
      reportPath: insertReport.reportPath,
      createdAt: insertReport.createdAt,
      total: (insertReport as any).total ?? 0,
      critical: (insertReport as any).critical ?? 0,
      high: (insertReport as any).high ?? 0,
      medium: (insertReport as any).medium ?? 0,
      low: (insertReport as any).low ?? 0,
      scanType: (insertReport as any).scanType ?? null,
    }).returning();
    return result[0];
  }

  async deleteReport(id: string): Promise<boolean> {
    await this.db.delete(reports).where(eq(reports.id, id));
    return true;
  }

  // Stats
  async getStats(): Promise<{ totalScans: number; totalVulnerabilities: number; criticalCount: number }> {
    const scanCount = await this.db.select({ count: sql`count(*)` }).from(scans);
    const vulnCount = await this.db.select({ count: sql`count(*)` }).from(vulnerabilities);
    const criticalCount = await this.db.select({ count: sql`count(*)` }).from(vulnerabilities).where(eq(vulnerabilities.severity, "critical"));

    return {
      totalScans: Number(scanCount[0]?.count || 0),
      totalVulnerabilities: Number(vulnCount[0]?.count || 0),
      criticalCount: Number(criticalCount[0]?.count || 0),
    };
  }
}

// Use database storage if DATABASE_URL is set, otherwise fall back to in-memory
export const storage: IStorage = process.env.DATABASE_URL
  ? new DbStorage()
  : new MemStorage();
