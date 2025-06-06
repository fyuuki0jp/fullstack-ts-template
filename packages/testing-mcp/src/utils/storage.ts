import { promises as fs } from 'fs';
import path from 'path';
import { DecisionTable, validateDecisionTable } from '../models/decision-table.js';

const STORAGE_DIR = path.join(process.cwd(), '.decision-tables');

export async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

export async function saveDecisionTable(table: DecisionTable): Promise<void> {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, `${table.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(table, null, 2));
}

export async function loadDecisionTable(id: string): Promise<DecisionTable | null> {
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return validateDecisionTable(data);
  } catch (error) {
    return null;
  }
}

export async function listDecisionTables(): Promise<DecisionTable[]> {
  await ensureStorageDir();
  
  try {
    const files = await fs.readdir(STORAGE_DIR);
    const tables: DecisionTable[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(STORAGE_DIR, file), 'utf-8');
        try {
          const table = validateDecisionTable(JSON.parse(content));
          tables.push(table);
        } catch (error) {
          // Skip invalid files
          console.error(`Failed to parse ${file}:`, error);
        }
      }
    }
    
    return tables;
  } catch (error) {
    return [];
  }
}

export async function deleteDecisionTable(id: string): Promise<boolean> {
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}