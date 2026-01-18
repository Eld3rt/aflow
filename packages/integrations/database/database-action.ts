import type {
  ExecutionContext,
  StepExecutor,
  StepExecutionResult,
} from '@aflow/workflow-core';
import { templateString } from '../template.js';
import { DatabaseClient, PostgresClient, MysqlClient } from './client.js';

/**
 * Database action executor.
 * Executes database operations (insert, update, select) on external databases.
 * Supports PostgreSQL and MySQL.
 */
export class DatabaseActionExecutor implements StepExecutor {
  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<StepExecutionResult> {
    // Extract and validate required config
    const databaseType = config.databaseType;
    if (!databaseType || typeof databaseType !== 'string') {
      throw new Error(
        'Database action requires a valid "databaseType" in config.databaseType (postgres | mysql)',
      );
    }

    if (databaseType !== 'postgres' && databaseType !== 'mysql') {
      throw new Error(
        `Database action databaseType must be "postgres" or "mysql", got: ${databaseType}`,
      );
    }

    const connectionConfig = config.connection;
    if (!connectionConfig || typeof connectionConfig !== 'object') {
      throw new Error(
        'Database action requires a valid "connection" object in config.connection',
      );
    }

    const conn = connectionConfig as Record<string, unknown>;
    const host = conn.host;
    const port = conn.port;
    const database = conn.database;
    const user = conn.user;
    const password = conn.password;

    if (!host || typeof host !== 'string') {
      throw new Error(
        'Database action connection requires a valid "host" string',
      );
    }
    if (!port || typeof port !== 'number') {
      throw new Error(
        'Database action connection requires a valid "port" number',
      );
    }
    if (!database || typeof database !== 'string') {
      throw new Error(
        'Database action connection requires a valid "database" string',
      );
    }
    if (!user || typeof user !== 'string') {
      throw new Error(
        'Database action connection requires a valid "user" string',
      );
    }
    if (!password || typeof password !== 'string') {
      throw new Error(
        'Database action connection requires a valid "password" string',
      );
    }

    const table = config.table;
    if (!table || typeof table !== 'string') {
      throw new Error(
        'Database action requires a valid "table" in config.table',
      );
    }

    const operation = config.operation;
    if (!operation || typeof operation !== 'string') {
      throw new Error(
        'Database action requires a valid "operation" in config.operation (insert | update | select)',
      );
    }

    if (
      operation !== 'insert' &&
      operation !== 'update' &&
      operation !== 'select'
    ) {
      throw new Error(
        `Database action operation must be "insert", "update", or "select", got: ${operation}`,
      );
    }

    // Create database client
    let client: DatabaseClient;
    if (databaseType === 'postgres') {
      client = new PostgresClient({
        host,
        port,
        database,
        user,
        password,
      });
    } else {
      client = new MysqlClient({
        host,
        port,
        database,
        user,
        password,
      });
    }

    try {
      // Connect to database
      await client.connect();

      // Template data and where clauses from context
      let templatedData: Record<string, unknown> | undefined;
      let templatedWhere: Record<string, unknown> | undefined;

      if (config.data) {
        templatedData = templateObject(config.data, context) as Record<
          string,
          unknown
        >;
      }

      if (config.where) {
        templatedWhere = templateObject(config.where, context) as Record<
          string,
          unknown
        >;
      }

      // Execute operation
      let result: unknown;

      if (operation === 'insert') {
        if (!templatedData) {
          throw new Error(
            'Database action insert operation requires "data" in config.data',
          );
        }
        result = await client.insert(table, templatedData);
      } else if (operation === 'update') {
        if (!templatedData) {
          throw new Error(
            'Database action update operation requires "data" in config.data',
          );
        }
        if (!templatedWhere) {
          throw new Error(
            'Database action update operation requires "where" in config.where',
          );
        }
        const affectedRows = await client.update(
          table,
          templatedData,
          templatedWhere,
        );
        result = { affectedRows };
      } else {
        // select
        result = await client.select(table, templatedWhere);
      }

      // Return result in output (will be merged into context)
      // Frontend schema expects "result" not "databaseResult" for user-friendly templating
      return {
        output: {
          result,
        },
      };
    } finally {
      // Always close connection
      await client.close();
    }
  }
}

/**
 * Recursively template string values in an object.
 * Templates any string values using templateString, recurses into objects and arrays.
 */
function templateObject(obj: unknown, context: ExecutionContext): unknown {
  if (typeof obj === 'string') {
    return templateString(obj, context);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => templateObject(item, context));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = templateObject(value, context);
    }
    return result;
  }
  return obj;
}
