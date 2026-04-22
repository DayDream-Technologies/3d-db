/**
 * Curated W3Schools SQL tutorial links used throughout the UI
 * to help users learn the concept behind a tip, column tag, or panel.
 * Source: https://www.w3schools.com/sql
 */

export const LEARN = {
  home: {
    label: "W3Schools SQL Tutorial",
    url: "https://www.w3schools.com/sql/",
  },
  createTable: {
    label: "CREATE TABLE",
    url: "https://www.w3schools.com/sql/sql_create_table.asp",
  },
  constraints: {
    label: "Constraints overview",
    url: "https://www.w3schools.com/sql/sql_constraints.asp",
  },
  dataTypes: {
    label: "SQL Data Types",
    url: "https://www.w3schools.com/sql/sql_datatypes.asp",
  },
  primaryKey: {
    label: "PRIMARY KEY",
    url: "https://www.w3schools.com/sql/sql_primarykey.asp",
  },
  foreignKey: {
    label: "FOREIGN KEY",
    url: "https://www.w3schools.com/sql/sql_foreignkey.asp",
  },
  createIndex: {
    label: "CREATE INDEX",
    url: "https://www.w3schools.com/sql/sql_create_index.asp",
  },
  notNull: {
    label: "NOT NULL",
    url: "https://www.w3schools.com/sql/sql_notnull.asp",
  },
  unique: {
    label: "UNIQUE",
    url: "https://www.w3schools.com/sql/sql_unique.asp",
  },
  select: {
    label: "SELECT",
    url: "https://www.w3schools.com/sql/sql_select.asp",
  },
  where: {
    label: "WHERE",
    url: "https://www.w3schools.com/sql/sql_where.asp",
  },
  joins: {
    label: "SQL Joins",
    url: "https://www.w3schools.com/sql/sql_join.asp",
  },
  innerJoin: {
    label: "INNER JOIN",
    url: "https://www.w3schools.com/sql/sql_join_inner.asp",
  },
  leftJoin: {
    label: "LEFT JOIN",
    url: "https://www.w3schools.com/sql/sql_join_left.asp",
  },
  groupBy: {
    label: "GROUP BY",
    url: "https://www.w3schools.com/sql/sql_groupby.asp",
  },
  views: {
    label: "CREATE VIEW",
    url: "https://www.w3schools.com/sql/sql_view.asp",
  },
  injection: {
    label: "SQL Injection",
    url: "https://www.w3schools.com/sql/sql_injection.asp",
  },
} as const;

export type LearnKey = keyof typeof LEARN;

/** Keys featured in the toolbar dropdown, in presentation order */
export const LEARN_MENU: LearnKey[] = [
  "home",
  "createTable",
  "constraints",
  "primaryKey",
  "foreignKey",
  "createIndex",
  "notNull",
  "dataTypes",
  "select",
  "joins",
  "innerJoin",
  "leftJoin",
  "groupBy",
  "views",
  "injection",
];
