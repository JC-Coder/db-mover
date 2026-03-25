import { Client } from "pg";
import { addLog, updateJob } from "../../lib/jobManager";

const getDbName = (uri: string): string => {
  try {
    const url = new URL(uri);
    return url.pathname.replace(/^\//, "").split("?")[0];
  } catch (e) {
    // Fallback parsing
    const match = uri.match(/\/\/(?:[^@]+@)?[^\/]+\/([^?]+)/);
    return match ? match[1] : "";
  }
};

const buildUriWithoutDb = (
  uri: string,
  defaultDb: string = "postgres"
): string => {
  try {
    const url = new URL(uri);
    url.pathname = `/${defaultDb}`;
    return url.toString();
  } catch (e) {
    // Fallback: replace database name in URI
    return uri.replace(/\/[^\/\?]+(\?|$)/, `/${defaultDb}$1`);
  }
};

const createDatabaseIfNotExists = async (
  adminClient: Client,
  dbName: string,
  jobId: string
): Promise<void> => {
  try {
    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      addLog(jobId, `Creating target database: ${dbName}`);
      // Create database (cannot use parameterized query for database name)
      // Escape the database name properly - PostgreSQL identifiers need double quotes
      const escapedDbName = `"${dbName.replace(/"/g, '""')}"`;
      await adminClient.query(`CREATE DATABASE ${escapedDbName}`);
      addLog(jobId, `Database created successfully: ${dbName}`);
    } else {
      addLog(jobId, `Target database already exists: ${dbName}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // If database already exists, that's fine
    if (errorMessage.includes("already exists")) {
      addLog(jobId, `Database already exists: ${dbName}`);
    } else {
      throw error;
    }
  }
};

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;

const extractSequenceRegclass = (columnDefault: string): string | null => {
  const match = columnDefault.match(/nextval\('([^']+)'::regclass\)/);
  return match ? match[1] : null;
};

const ensureSequenceExists = async (
  sourceClient: Client,
  targetClient: Client,
  sequenceRegclass: string,
  jobId: string,
  migratedSequences: Set<string>,
  sequenceStates: Map<string, { lastValue: unknown; isCalled: boolean }>
): Promise<void> => {
  const sequenceDetails = await sourceClient.query(
    `
      SELECT
        n.nspname AS schema_name,
        c.relname AS sequence_name,
        s.seqstart AS start_value,
        s.seqincrement AS increment_by,
        s.seqmin AS min_value,
        s.seqmax AS max_value,
        s.seqcache AS cache_size,
        s.seqcycle AS cycle
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_sequence s ON s.seqrelid = c.oid
      WHERE c.oid = to_regclass($1)
    `,
    [sequenceRegclass]
  );

  if (sequenceDetails.rows.length === 0) {
    addLog(
      jobId,
      `Warning: could not find sequence metadata for ${sequenceRegclass}`
    );
    return;
  }

  const sequence = sequenceDetails.rows[0];
  const schemaName = sequence.schema_name as string;
  const sequenceName = sequence.sequence_name as string;
  const qualifiedIdentifier = `${quoteIdentifier(schemaName)}.${quoteIdentifier(sequenceName)}`;

  if (!migratedSequences.has(qualifiedIdentifier)) {
    await targetClient.query(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`
    );

    await targetClient.query(
      `
        CREATE SEQUENCE IF NOT EXISTS ${qualifiedIdentifier}
        INCREMENT BY ${String(sequence.increment_by)}
        MINVALUE ${String(sequence.min_value)}
        MAXVALUE ${String(sequence.max_value)}
        START WITH ${String(sequence.start_value)}
        CACHE ${String(sequence.cache_size)}
        ${sequence.cycle ? "CYCLE" : "NO CYCLE"}
      `
    );

    addLog(jobId, `Ensured sequence exists: ${qualifiedIdentifier}`);
    migratedSequences.add(qualifiedIdentifier);

    const stateResult = await sourceClient.query(
      `SELECT last_value, is_called FROM ${qualifiedIdentifier}`
    );

    if (stateResult.rows.length > 0) {
      sequenceStates.set(qualifiedIdentifier, {
        lastValue: stateResult.rows[0].last_value,
        isCalled: Boolean(stateResult.rows[0].is_called),
      });
    }
  }
};

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string
) => {
  let sourceClient: Client | null = null;
  let targetClient: Client | null = null;

  try {
    updateJob(jobId, { status: "running", progress: 0 });
    addLog(jobId, "Starting PostgreSQL migration...");

    // Connect to source
    addLog(jobId, "Connecting to source database...");
    sourceClient = new Client({ connectionString: sourceUri });
    await sourceClient.connect();
    addLog(jobId, "Connected to source.");

    const sourceDbName = getDbName(sourceUri);
    const targetDbName = getDbName(targetUri);

    // Set search_path to include all schemas to help format_type omit schema prefixes
    try {
      const schemasResult = await sourceClient.query(`
        SELECT nspname FROM pg_namespace 
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
      `);
      const schemas = schemasResult.rows.map((r) => `"${r.nspname}"`);
      if (schemas.length > 0) {
        await sourceClient.query(
          `SET search_path TO ${schemas.join(", ")}, public`
        );
      }
    } catch (e) {
      console.warn("Could not set search_path on source:", e);
    }

    // Create target database if it doesn't exist
    if (targetDbName) {
      addLog(jobId, `Checking if target database exists: ${targetDbName}`);

      // Try connecting to target DB first to see if it already exists
      let targetExists = false;
      const checkClient = new Client({ connectionString: targetUri });
      try {
        await checkClient.connect();
        targetExists = true;
        addLog(jobId, `Target database ${targetDbName} already exists.`);
      } catch (e: unknown) {
        // Database does not exist (code 3D000)
        const error = e as { code?: string; message?: string };
        if (error.code === "3D000") {
          addLog(
            jobId,
            `Target database ${targetDbName} does not exist. Attempting to create...`
          );
        } else {
          addLog(
            jobId,
            `Warning: Could not connect to target database to check existence: ${error.message}`
          );
          // We'll still try to create it via admin connection just in case
        }
      } finally {
        try {
          await checkClient.end();
        } catch (err) {}
      }

      if (!targetExists) {
        // Attempt to connect to a default database to create the target
        // We try 'postgres' first, then 'template1'
        const defaultDbs = ["postgres", "template1"];
        let connected = false;

        for (const db of defaultDbs) {
          const adminUri = buildUriWithoutDb(targetUri, db);
          const adminClient = new Client({ connectionString: adminUri });
          try {
            addLog(
              jobId,
              `Connecting to admin database '${db}' to create target...`
            );
            await adminClient.connect();
            await createDatabaseIfNotExists(adminClient, targetDbName, jobId);
            await adminClient.end();
            connected = true;
            break;
          } catch (e: unknown) {
            const error = e as { message?: string };
            addLog(
              jobId,
              `Failed to connect to admin database '${db}': ${error.message}`
            );
            try {
              await adminClient.end();
            } catch (err) {}
          }
        }

        if (!connected) {
          addLog(
            jobId,
            "Warning: Could not connect to any default database to create target. Migration might fail if database doesn't exist."
          );
        }
      }
    }

    // Connect to target
    addLog(jobId, "Connecting to target database...");
    targetClient = new Client({ connectionString: targetUri });
    await targetClient.connect();
    addLog(jobId, "Connected to target.");

    // Migrate custom types (ENUMs) before creating tables
    addLog(jobId, "Checking for custom types (ENUMs)...");
    const customTypesResult = await sourceClient.query(`
      SELECT 
        t.typname as type_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
      GROUP BY t.typname
    `);

    if (customTypesResult.rows.length > 0) {
      addLog(
        jobId,
        `Found ${customTypesResult.rows.length} custom types to migrate`
      );

      for (const typeRow of customTypesResult.rows) {
        const typeName = typeRow.type_name;
        // Postgres array_agg returns an actual array in pg-node, but let's be safe
        let enumValues = typeRow.enum_values;

        if (!Array.isArray(enumValues)) {
          if (typeof enumValues === "string") {
            // Handle cases where it might be a string representation of an array like {val1,val2}
            try {
              enumValues = enumValues
                .replace(/[{}]/g, "")
                .split(",")
                .map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
            } catch (e) {
              addLog(
                jobId,
                `Warning: Could not parse enum values for ${typeName}`
              );
              continue;
            }
          } else {
            addLog(
              jobId,
              `Warning: enum_values is not an array for ${typeName}`
            );
            continue;
          }
        }

        try {
          // Check if type already exists in target (in any non-system schema)
          const typeExists = await targetClient.query(
            `SELECT 1 FROM pg_type t
             JOIN pg_namespace n ON n.oid = t.typnamespace
             WHERE t.typname = $1 AND n.nspname NOT IN ('pg_catalog', 'information_schema')`,
            [typeName]
          );

          if (typeExists.rows.length === 0) {
            addLog(jobId, `Creating custom type: ${typeName}`);
            // Create ENUM type - always quote the type name for consistency
            const enumValuesStr = enumValues
              .map((val: unknown) => `'${String(val).replace(/'/g, "''")}'`)
              .join(", ");
            await targetClient.query(
              `CREATE TYPE "${typeName}" AS ENUM (${enumValuesStr})`
            );
            addLog(jobId, `Created custom type: ${typeName}`);
          } else {
            addLog(jobId, `Custom type already exists: ${typeName}`);
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // If type already exists, that's fine
          if (errorMessage.includes("already exists")) {
            addLog(jobId, `Custom type already exists: ${typeName}`);
          } else {
            addLog(
              jobId,
              `Warning: Could not create custom type ${typeName}: ${errorMessage}`
            );
            // Continue - might still work if type exists
          }
        }
      }
    } else {
      addLog(jobId, "No custom types found.");
    }

    // Get list of tables from source
    const tablesResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((row) => row.table_name);

    if (tables.length === 0) {
      addLog(jobId, "No tables found in source database.");
      updateJob(jobId, { status: "completed", progress: 100 });
      return;
    }

    addLog(
      jobId,
      `Found ${tables.length} tables to migrate: ${tables.join(", ")}`
    );

    let totalRowsCopied = 0;
    const totalTables = tables.length;
    let tablesProcessed = 0;
    const tableErrors: string[] = [];
    const deferredForeignKeys: Array<{
      tableName: string;
      constraintName: string;
      constraintDef: string;
    }> = [];
    const migratedSequences = new Set<string>();
    const sequenceStates = new Map<
      string,
      { lastValue: unknown; isCalled: boolean }
    >();

    // Migrate each table
    for (const tableName of tables) {
      addLog(jobId, `Processing table: ${tableName}`);

      try {
        // Get column information using pg_catalog for better accuracy with custom types
        const tableRegclass = `"${tableName.replace(/"/g, '""')}"`;
        const columnInfo = await sourceClient.query(
          `
          SELECT 
            a.attname AS column_name,
            format_type(a.atttypid, a.atttypmod) AS full_type,
            a.attnotnull AS is_not_null,
            pg_get_expr(d.adbin, d.adrelid) AS column_default,
            a.attidentity AS identity_type,
            t.typname AS udt_name,
            n.nspname AS udt_schema
          FROM pg_attribute a
          JOIN pg_type t ON a.atttypid = t.oid
          JOIN pg_namespace n ON t.typnamespace = n.oid
          LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
          WHERE a.attrelid = $1::regclass
          AND a.attnum > 0
          AND NOT a.attisdropped
          ORDER BY a.attnum
        `,
          [tableRegclass]
        );

        const constraintsInfo = await sourceClient.query(
          `
          SELECT
            conname AS constraint_name,
            contype AS constraint_type,
            pg_get_constraintdef(oid, true) AS constraint_def
          FROM pg_constraint
          WHERE conrelid = $1::regclass
          ORDER BY conname
        `,
          [tableRegclass]
        );

        // Drop table if exists on target (for clean migration)
        await targetClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);

        for (const col of columnInfo.rows) {
          const columnDefault = col.column_default as string | null;
          const identityType = col.identity_type as string;
          if (!columnDefault || identityType) {
            continue;
          }

          const sequenceRegclass = extractSequenceRegclass(columnDefault);
          if (sequenceRegclass) {
            await ensureSequenceExists(
              sourceClient,
              targetClient,
              sequenceRegclass,
              jobId,
              migratedSequences,
              sequenceStates
            );
          }
        }

        // Build CREATE TABLE statement
        const columns = columnInfo.rows.map((col) => {
          const columnName = col.column_name;
          let typeDef = col.full_type;
          const isNotNull = col.is_not_null;
          const columnDefault = col.column_default as string | null;
          const identityType = col.identity_type as string;

          // Double quote the type name if it looks like a custom type (no parentheses, potentially mixed case)
          // format_type() usually returns mixed case types without quotes if they are in the search_path.
          // We want to ensure they are quoted in the CREATE TABLE statement to match how we created them.
          if (
            !typeDef.startsWith('"') &&
            !typeDef.includes("(") &&
            !typeDef.includes(" ") &&
            typeDef !== typeDef.toLowerCase()
          ) {
            // It's likely a custom type like UserRole
            typeDef = `"${typeDef}"`;
          } else if (typeDef.includes("[]")) {
            // Handle arrays of custom types, e.g., UserRole[] -> "UserRole"[]
            const baseType = typeDef.replace("[]", "");
            if (
              !baseType.startsWith('"') &&
              !baseType.includes(" ") &&
              baseType !== baseType.toLowerCase()
            ) {
              typeDef = `"${baseType}"[]`;
            }
          }

          let colDef = `"${columnName}" ${typeDef}`;

          if (identityType === "a") {
            colDef += " GENERATED ALWAYS AS IDENTITY";
          } else if (identityType === "d") {
            colDef += " GENERATED BY DEFAULT AS IDENTITY";
          }

          if (isNotNull) {
            colDef += " NOT NULL";
          }

          if (columnDefault && !identityType) {
            colDef += ` DEFAULT ${columnDefault}`;
          }

          return colDef;
        });

        const createTableSQL = `CREATE TABLE "${tableName}" (${columns.join(
          ", "
        )});`;

        await targetClient.query(createTableSQL);
        addLog(jobId, `Created table structure: ${tableName}`);

        // Copy data in batches
        const BATCH_SIZE = 1000;
        let offset = 0;
        let batchRows = 0;

        while (true) {
          const rows = await sourceClient.query(
            `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
            [BATCH_SIZE, offset]
          );

          if (rows.rows.length === 0) break;

          // Build INSERT statement
          const columnNames = columnInfo.rows
            .map((col) => `"${col.column_name}"`)
            .join(", ");

          // Insert rows one by one or in smaller batches to avoid parameter limit issues
          // PostgreSQL has a limit of 65535 parameters, so we'll insert in smaller batches
          const INSERT_BATCH = 100;

          for (
            let batchStart = 0;
            batchStart < rows.rows.length;
            batchStart += INSERT_BATCH
          ) {
            const batchEnd = Math.min(
              batchStart + INSERT_BATCH,
              rows.rows.length
            );
            const batch = rows.rows.slice(batchStart, batchEnd);

            const values: unknown[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;

            for (const row of batch) {
              const rowValues = columnInfo.rows.map(
                (col) => row[col.column_name]
              );
              values.push(...rowValues);
              const ph =
                "(" + rowValues.map(() => `$${paramIndex++}`).join(", ") + ")";
              placeholders.push(ph);
            }

            const insertSQL = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${placeholders.join(
              ", "
            )}`;
            await targetClient.query(insertSQL, values);
          }

          batchRows += rows.rows.length;
          totalRowsCopied += rows.rows.length;
          offset += BATCH_SIZE;

          updateJob(jobId, {
            stats: {
              tables: tablesProcessed,
              documents: totalRowsCopied,
            },
          });

          if (rows.rows.length < BATCH_SIZE) break;
        }

        addLog(jobId, `Copied ${batchRows} rows from table: ${tableName}`);

        // Apply non-foreign-key constraints on the table.
        for (const constraint of constraintsInfo.rows) {
          const constraintName = constraint.constraint_name as string;
          const constraintType = constraint.constraint_type as string;
          const constraintDef = constraint.constraint_def as string;
          const escapedConstraintName = quoteIdentifier(constraintName);

          if (constraintType === "f") {
            deferredForeignKeys.push({
              tableName,
              constraintName,
              constraintDef,
            });
            continue;
          }

          await targetClient.query(
            `ALTER TABLE "${tableName}" ADD CONSTRAINT ${escapedConstraintName} ${constraintDef}`
          );
        }

        // Copy only non-constraint-backed indexes.
        const indexesResult = await sourceClient.query(
          `
          SELECT
            idx.relname AS indexname,
            pg_get_indexdef(i.indexrelid) AS indexdef
          FROM pg_index i
          JOIN pg_class tbl ON tbl.oid = i.indrelid
          JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
          JOIN pg_class idx ON idx.oid = i.indexrelid
          LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
          WHERE ns.nspname = 'public'
            AND tbl.relname = $1
            AND con.oid IS NULL
        `,
          [tableName]
        );

        if (indexesResult.rows.length > 0) {
          for (const idx of indexesResult.rows) {
            try {
              await targetClient.query(idx.indexdef);
              addLog(jobId, `Created index: ${idx.indexname}`);
            } catch (err) {
              // Index might already exist or have issues, continue
              console.warn(`Failed to create index ${idx.indexname}:`, err);
            }
          }
        }

        tablesProcessed++;
        const progress = (tablesProcessed / totalTables) * 100;
        updateJob(jobId, {
          progress,
          stats: {
            tables: tablesProcessed,
            documents: totalRowsCopied,
          },
        });

        addLog(jobId, `Finished table: ${tableName}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(jobId, `Error processing table ${tableName}: ${errorMessage}`);
        tableErrors.push(`${tableName}: ${errorMessage}`);
        // Continue with next table
      }
    }

    // Apply foreign keys only after all tables are present.
    for (const fk of deferredForeignKeys) {
      try {
        await targetClient.query(
          `ALTER TABLE "${fk.tableName}" ADD CONSTRAINT ${quoteIdentifier(
            fk.constraintName
          )} ${fk.constraintDef}`
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(
          jobId,
          `Error adding foreign key ${fk.constraintName} on ${fk.tableName}: ${errorMessage}`
        );
        tableErrors.push(
          `${fk.tableName} (FK ${fk.constraintName}): ${errorMessage}`
        );
      }
    }

    // Restore sequence positions after data copy.
    for (const [sequenceName, sequenceState] of sequenceStates.entries()) {
      try {
        await targetClient.query(`SELECT setval($1::regclass, $2, $3)`, [
          sequenceName,
          sequenceState.lastValue,
          sequenceState.isCalled,
        ]);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(
          jobId,
          `Warning: failed to update sequence value for ${sequenceName}: ${errorMessage}`
        );
      }
    }

    if (tableErrors.length > 0) {
      throw new Error(
        `PostgreSQL migration completed with ${tableErrors.length} table metadata/data errors: ${tableErrors.join(
          " | "
        )}`
      );
    }

    addLog(jobId, "Migration completed successfully!");
    updateJob(jobId, { status: "completed", progress: 100 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Migration failed:", error);
    addLog(jobId, `Error: ${errorMessage}`);
    updateJob(jobId, { status: "failed", error: errorMessage });
  } finally {
    if (sourceClient) {
      try {
        await sourceClient.end();
      } catch (e) {
        console.error("Error closing source client:", e);
      }
    }
    if (targetClient) {
      try {
        await targetClient.end();
      } catch (e) {
        console.error("Error closing target client:", e);
      }
    }
  }
};
