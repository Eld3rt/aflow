import mysql from 'mysql2/promise';
import pg from 'pg';

/**
 * Database client interface.
 * Abstracts database operations behind a provider-agnostic interface.
 */
export interface DatabaseClient {
  /**
   * Connect to the database.
   */
  connect(): Promise<void>;

  /**
   * Execute a raw SQL query.
   */
  query(sql: string, params?: unknown[]): Promise<unknown[]>;

  /**
   * Insert a row into a table.
   */
  insert(table: string, data: Record<string, unknown>): Promise<unknown>;

  /**
   * Update rows in a table.
   */
  update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number>;

  /**
   * Select rows from a table.
   */
  select(table: string, where?: Record<string, unknown>): Promise<unknown[]>;

  /**
   * Close the database connection.
   */
  close(): Promise<void>;
}

/**
 * PostgreSQL client implementation.
 */
export class PostgresClient implements DatabaseClient {
  private client: pg.Client;

  constructor(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.client = new pg.Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async insert(table: string, data: Record<string, unknown>): Promise<unknown> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${this.escapeIdentifier(table)} (${keys
      .map((k) => this.escapeIdentifier(k))
      .join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const result = await this.query(sql, values);
    return result[0];
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number> {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = dataKeys
      .map((key, i) => `${this.escapeIdentifier(key)} = $${i + 1}`)
      .join(', ');
    const whereClause = whereKeys
      .map(
        (key, i) =>
          `${this.escapeIdentifier(key)} = $${dataKeys.length + i + 1}`,
      )
      .join(' AND ');

    const sql = `UPDATE ${this.escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause}`;
    const params = [...dataValues, ...whereValues];

    const result = await this.client.query(sql, params);
    return result.rowCount || 0;
  }

  async select(
    table: string,
    where?: Record<string, unknown>,
  ): Promise<unknown[]> {
    let sql = `SELECT * FROM ${this.escapeIdentifier(table)}`;
    const params: unknown[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereKeys
        .map((key, i) => `${this.escapeIdentifier(key)} = $${i + 1}`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...whereValues);
    }

    return this.query(sql, params);
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[a-zA-Z0-9_.]+$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return `"${identifier}"`; // PostgreSQL uses double quotes
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}

/**
 * MySQL client implementation.
 */
export class MysqlClient implements DatabaseClient {
  private connection: mysql.Connection | null = null;
  private config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };

  constructor(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    if (!this.connection) {
      throw new Error(
        'Database connection not established. Call connect() first.',
      );
    }
    const [rows] = await this.connection.execute(sql, params);
    return rows as unknown[];
  }

  async insert(table: string, data: Record<string, unknown>): Promise<unknown> {
    if (!this.connection) {
      throw new Error(
        'Database connection not established. Call connect() first.',
      );
    }
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.escapeIdentifier(table)} (${keys
      .map((k) => this.escapeIdentifier(k))
      .join(', ')}) VALUES (${placeholders})`;

    await this.connection.execute(sql, values);
    const [result] = await this.connection.execute(
      `SELECT * FROM ${this.escapeIdentifier(table)} WHERE id = LAST_INSERT_ID()`,
    );
    return (result as unknown[])[0];
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<number> {
    if (!this.connection) {
      throw new Error(
        'Database connection not established. Call connect() first.',
      );
    }
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = dataKeys
      .map((key) => `${this.escapeIdentifier(key)} = ?`)
      .join(', ');
    const whereClause = whereKeys
      .map((key) => `${this.escapeIdentifier(key)} = ?`)
      .join(' AND ');

    const sql = `UPDATE ${this.escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause}`;
    const params = [...dataValues, ...whereValues];

    const [result] = await this.connection.execute(sql, params);
    return (result as { affectedRows: number }).affectedRows;
  }

  async select(
    table: string,
    where?: Record<string, unknown>,
  ): Promise<unknown[]> {
    if (!this.connection) {
      throw new Error(
        'Database connection not established. Call connect() first.',
      );
    }
    let sql = `SELECT * FROM ${this.escapeIdentifier(table)}`;
    const params: unknown[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereKeys
        .map((key) => `${this.escapeIdentifier(key)} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...whereValues);
    }

    return this.query(sql, params);
  }

  private escapeIdentifier(identifier: string): string {
    if (!/^[a-zA-Z0-9_.]+$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return `\`${identifier}\``; // MySQL uses backticks
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}
