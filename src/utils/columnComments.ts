import React, { useState, useEffect } from 'react';
import { findColumnDef } from './excelParser';

export const SPREADSHEET_COMMENTS_STORAGE_KEY = 'metta_spreadsheet_column_comments_v2';

/**
 * Predefined spreadsheet column comments.
 * Must NOT contain synthetic AI-generated definitions.
 * Only verified notes extracted directly from spreadsheet header cells are stored here.
 */
export const DEFAULT_COLUMN_COMMENTS: Record<string, string> = {};

// In-memory cache of comments extracted directly from spreadsheet cells (e.g. BA2, BH2, BO2, BP2, BQ2, CB2)
let dynamicSpreadsheetComments: Record<string, string> = {};

// Subscriber listeners to notify React components when comments are updated
type CommentListener = (comments: Record<string, string>) => void;
const listeners = new Set<CommentListener>();

export function subscribeToColumnComments(listener: CommentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach(fn => {
    try {
      fn(dynamicSpreadsheetComments);
    } catch (e) {
      console.error('Failed to notify comment listener:', e);
    }
  });
}

// Load stored comments from localStorage on initialization
try {
  if (typeof window !== 'undefined') {
    // Clear out any old v1 synthetic comments
    localStorage.removeItem('metta_spreadsheet_column_comments_v1');

    const saved = localStorage.getItem(SPREADSHEET_COMMENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        dynamicSpreadsheetComments = parsed;
      }
    }
  }
} catch (e) {
  console.warn('Failed to load spreadsheet comments from localStorage:', e);
}

/**
 * Returns a clone of all currently registered spreadsheet comments.
 */
export function getAllColumnComments(): Record<string, string> {
  return { ...dynamicSpreadsheetComments };
}

/**
 * Registers comments extracted from a spreadsheet file into memory and localStorage.
 */
export function registerColumnComments(comments: Record<string, string>): void {
  if (!comments || typeof comments !== 'object') return;
  dynamicSpreadsheetComments = {
    ...dynamicSpreadsheetComments,
    ...comments
  };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SPREADSHEET_COMMENTS_STORAGE_KEY, JSON.stringify(dynamicSpreadsheetComments));
    }
  } catch (e) {
    console.warn('Failed to save spreadsheet comments to localStorage:', e);
  }
  notifyListeners();
}

/**
 * Registers a single column comment.
 */
export function registerColumnComment(fieldName: string, comment: string): void {
  if (!fieldName || !comment) return;
  registerColumnComments({ [fieldName]: comment });
}

/**
 * Helper to normalize field name strings for fuzzy normalized matching.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves the comment for a given column/field name or cell reference (e.g. 'BA2', 'Situational Assessment').
 * Strictly returns actual comments extracted from the spreadsheet cells.
 */
export function getColumnComment(fieldKey: string): string | undefined {
  if (!fieldKey || typeof fieldKey !== 'string') return undefined;
  const cleanKey = fieldKey.trim();
  if (!cleanKey) return undefined;

  // 1. Direct match in dynamic comments
  if (dynamicSpreadsheetComments[cleanKey]) {
    return dynamicSpreadsheetComments[cleanKey];
  }

  // 2. Direct match in DEFAULT_COLUMN_COMMENTS
  if (DEFAULT_COLUMN_COMMENTS[cleanKey]) {
    return DEFAULT_COLUMN_COMMENTS[cleanKey];
  }

  // 3. Match via ColumnDef in SPREADSHEET_COLUMNS (cross-referencing letter, cell ref 'BA2', and field name)
  const colDef = findColumnDef(cleanKey);
  if (colDef) {
    const candidateKeys = [
      colDef.field,
      colDef.letter,
      `${colDef.letter}2`,
      `${colDef.letter}1`,
      ...(colDef.aliases || [])
    ];

    for (const ck of candidateKeys) {
      if (dynamicSpreadsheetComments[ck]) {
        return dynamicSpreadsheetComments[ck];
      }
      if (DEFAULT_COLUMN_COMMENTS[ck]) {
        return DEFAULT_COLUMN_COMMENTS[ck];
      }
    }
  }

  // 4. Normalized match against dynamic comments
  const normTarget = normalizeKey(cleanKey);
  for (const [key, comment] of Object.entries(dynamicSpreadsheetComments)) {
    if (normalizeKey(key) === normTarget) {
      return comment;
    }
  }

  // 5. Normalized match against DEFAULT_COLUMN_COMMENTS
  for (const [key, comment] of Object.entries(DEFAULT_COLUMN_COMMENTS)) {
    if (normalizeKey(key) === normTarget) {
      return comment;
    }
  }

  return undefined;
}

/**
 * React hook to reactively subscribe to spreadsheet comment changes for a given field or cell reference.
 */
export function useColumnComment(fieldName: string, cellRef?: string): string | undefined {
  const [comment, setComment] = useState<string | undefined>(() => {
    return (cellRef ? getColumnComment(cellRef) : undefined) || getColumnComment(fieldName);
  });

  useEffect(() => {
    const update = () => {
      const found = (cellRef ? getColumnComment(cellRef) : undefined) || getColumnComment(fieldName);
      setComment(found);
    };
    update();
    return subscribeToColumnComments(update);
  }, [fieldName, cellRef]);

  return comment;
}

/**
 * Checks if a column/field has an associated comment.
 */
export function hasColumnComment(fieldKey: string): boolean {
  return !!getColumnComment(fieldKey);
}
