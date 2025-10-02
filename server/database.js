import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'los-ojos.db');

export let db;

// MOCK DATA for initial seeding
const MOCK_PRODUCERS = [
    { id: 1, name: 'ATÖLYE A', contactPerson: 'Ahmet Yılmaz', phone: '555-111-2233', address: 'İstanbul' },
    { id: 2, name: 'ATÖLYE B', contactPerson: 'Ayşe Kaya', phone: '555-444-5566', address: 'Bursa' },
    { id: 3, name: 'ATÖLYE C', contactPerson: 'Mehmet Öztürk', phone: '555-777-8899', address: 'İzmir' },
];
const MOCK_COLORS = [ { id: 1, name: 'SİYAH' }, { id: 2, name: 'BEYAZ' }, { id: 3, name: 'LACİVERT' }, { id: 4, name: 'ANTRASİT' }, { id: 5, name: 'KIRMIZI' }];
const MOCK_DEFECT_REASONS = [ { id: 1, name: 'DİKİŞ HATASI' }, { id: 2, name: 'KUMAŞ DEFOSU' }, { id: 3, name: 'BASKI/NAKIŞ HATASI' }, { id: 4, name: 'LEKE' }, { id: 5, name: 'ÖLÇÜ HATASI' }];


export async function initDb() {
  if (db) return; // Prevent re-initialization

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        groupId TEXT NOT NULL,
        createdDate TEXT NOT NULL,
        completionDate TEXT,
        productName TEXT NOT NULL,
        color TEXT NOT NULL,
        producer TEXT,
        sizes TEXT NOT NULL,
        totalQuantity INTEGER NOT NULL,
        status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        productName TEXT NOT NULL,
        color TEXT NOT NULL,
        producer TEXT,
        normalSizes TEXT NOT NULL,
        defectiveSizes TEXT NOT NULL,
        defectReason TEXT,
        isArchived INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cutting_reports (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        groupId TEXT NOT NULL,
        productName TEXT NOT NULL,
        color TEXT NOT NULL,
        sizes TEXT NOT NULL,
        isConfirmed INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS colors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS producers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        contactPerson TEXT,
        phone TEXT,
        address TEXT
    );
    CREATE TABLE IF NOT EXISTS defect_reasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );
  `);

  // Seed initial data if tables are empty
  const colorCount = await db.get('SELECT COUNT(*) as count FROM colors');
  if (colorCount.count === 0) {
      console.log("Database is empty. Seeding initial data...");
      await db.exec('BEGIN TRANSACTION');
      try {
          for (const color of MOCK_COLORS) await db.run('INSERT INTO colors (id, name) VALUES (?, ?)', color.id, color.name);
          for (const producer of MOCK_PRODUCERS) await db.run('INSERT INTO producers (id, name, contactPerson, phone, address) VALUES (?, ?, ?, ?, ?)', producer.id, producer.name, producer.contactPerson, producer.phone, producer.address);
          for (const reason of MOCK_DEFECT_REASONS) await db.run('INSERT INTO defect_reasons (id, name) VALUES (?, ?)', reason.id, reason.name);
          await db.exec('COMMIT');
          console.log("Initial data seeded successfully.");
      } catch (e) {
          await db.exec('ROLLBACK');
          console.error("Failed to seed data:", e);
      }
  }
}
