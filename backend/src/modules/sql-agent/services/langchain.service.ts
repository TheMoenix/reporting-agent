import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { SqlToolkit } from '@langchain/classic/agents/toolkits/sql';
import {
  SqlDatabase,
  SqlDatabaseOptionsParams,
} from '@langchain/classic/sql_db';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
export interface UserDatasourceConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql';
}

@Injectable()
export class LangChainService {
  private openaiLLM: ChatOpenAI | null;
  private anthropicLLM: ChatAnthropic | null;
  private s3Client: S3Client;

  constructor() {
    this.initializeLLMs();
    this.initializeS3();
  }

  private initializeS3() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      requestHandler: {
        requestTimeout: parseInt(process.env.AWS_S3_REQUEST_TIMEOUT) || 60000, // 60 seconds
        connectionTimeout:
          parseInt(process.env.AWS_S3_CONNECTION_TIMEOUT) || 5000, // 5 seconds
      },
      // Configure multipart upload settings
      maxAttempts: parseInt(process.env.AWS_S3_MAX_RETRIES) || 3,
      retryMode: 'adaptive',
    });
  }

  private initializeLLMs() {
    // Initialize OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openaiLLM = new ChatOpenAI({
        model: 'gpt-4.1-mini-2025-04-14',
        temperature: 0,
        apiKey: openaiApiKey,
        metadata: { provider: 'openai' },
      });
    }

    // Initialize Anthropic (optional)
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
      this.anthropicLLM = new ChatAnthropic({
        model: 'claude-3-haiku-20240307',
        temperature: 0,
        apiKey: anthropicApiKey,
        metadata: { provider: 'anthropic' },
      });
    }

    if (!openaiApiKey && !anthropicApiKey) {
      console.error('No LLM initialized. Missing API keys or base URLs.');
    }
  }

  async getSqlDatabase(
    connectionConfig?: UserDatasourceConfig,
  ): Promise<SqlDatabase> {
    // Require explicit connection config - no defaults allowed
    if (!connectionConfig) {
      throw new Error(
        'Database connection configuration is required. Please provide valid connection details.',
      );
    }

    const config = connectionConfig;

    // First create a basic SqlDatabase to check which tables exist
    const basicOptions: SqlDatabaseOptionsParams = {
      appDataSourceOptions: {
        type: config.type as any,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      },
      // Don't ignore any tables for the initial connection
      ignoreTables: [],
    };

    // Create basic connection to query existing tables
    const basicSqlDatabase = await SqlDatabase.fromOptionsParams(basicOptions);

    // Get list of all existing tables in the database
    let existingTables: string[] = [];
    try {
      const tablesQuery = this.getTablesQuery(config.type);
      const tablesResult = await basicSqlDatabase.run(tablesQuery);
      existingTables = tablesResult
        .split('\n')
        .slice(1) // Skip header
        .map((line) => line.trim())
        .filter((line) => line && line !== '')
        .map((line) => line.split('|')[0]?.trim())
        .filter((table) => table);
    } catch (error) {
      console.error(`Failed to get existing tables: ${error}`);
      // If we can't get the table list, proceed without ignore tables
      existingTables = [];
    }

    // Now create the final SqlDatabase with filtered ignore tables
    const options: SqlDatabaseOptionsParams = {
      appDataSourceOptions: {
        type: config.type as any,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      },
    };

    const sqlDatabase = await SqlDatabase.fromOptionsParams(options);

    // Test connection with a simple query
    const testQuery = this.getTestQuery(config.type);
    await sqlDatabase.run(testQuery).then(() => {
      console.info(
        `Connected to ${config.database} at ${config.host}:${config.port}`,
      );
    });

    return sqlDatabase;
  }

  getLLM(provider?: string): ChatOpenAI | ChatAnthropic {
    switch (provider) {
      case 'openai':
        if (this.openaiLLM) return this.openaiLLM;
        break;
      case 'anthropic':
        if (this.anthropicLLM) return this.anthropicLLM;
        break;
    }
    // Default: return first available LLM
    return this.openaiLLM || this.anthropicLLM;
  }

  getAvailableLLMs(): Array<{
    id: string;
    name: string;
    provider: string;
    model: string;
    isAvailable: boolean;
  }> {
    const llms = [];

    if (this.openaiLLM) {
      llms.push({
        id: 'openai',
        name: 'OpenAI GPT-4.1 Mini',
        provider: 'openai',
        model: 'gpt-4.1-mini-2025-04-14',
        isAvailable: true,
      });
    }

    if (this.anthropicLLM) {
      llms.push({
        id: 'anthropic',
        name: 'Anthropic Claude 3 Haiku',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        isAvailable: true,
      });
    }

    return llms;
  }

  async createSqlToolkit(
    llm: ChatOpenAI | ChatAnthropic,
    connectionConfig?: UserDatasourceConfig,
  ): Promise<SqlToolkit> {
    const sqlDatabase = await this.getSqlDatabase(connectionConfig);
    return new SqlToolkit(sqlDatabase, llm);
  }

  createExcelExportTool() {
    return new DynamicStructuredTool({
      name: 'excel_export',
      description: `Export query results to Excel and upload to S3, returning a public URL. 
      IMPORTANT: You must provide the 'data' parameter with the actual query results as an array of objects.
      Use this tool AFTER you have executed a SQL query and obtained the results.
      Best for tabular results with 5+ rows.
      
      Example usage:
      1. First run a SQL query to get results
      2. Then call this tool with the results data
      
      The data should be an array of objects where each object represents a row.`,
      schema: z.object({
        data: z
          .array(z.record(z.string(), z.unknown()))
          .min(
            1,
            'You must provide the actual query results data as an array of objects. Each object represents a row from your SQL query results.',
          ),
        filename: z
          .string()
          .optional()
          .describe(
            'Optional filename for the Excel file (will add .xlsx if not present)',
          ),
        sheetName: z
          .string()
          .optional()
          .describe('Optional name for the Excel worksheet'),
      }) as any,

      func: async (args: {
        data: Array<Record<string, unknown>>;
        filename?: string;
        sheetName?: string;
      }): Promise<string> => {
        const { data, filename, sheetName } = args;
        try {
          if (!data) {
            return 'Error: No data parameter provided. You must pass the actual query results as the "data" parameter. First execute a SQL query to get results, then pass those results to this tool.';
          }

          if (!Array.isArray(data) || data.length === 0) {
            return 'Error: Data must be a non-empty array of objects. Each object should represent a row from your SQL query results. Example: [{"column1": "value1", "column2": "value2"}]';
          }

          const bucketName =
            process.env.AWS_S3_BUCKET || 'reporting-agent-files';

          const sanitizeSheetName = (name?: string) => {
            const invalid = /[:\\/?*\[\]]/g;
            const cleaned = (name || 'Report').replace(invalid, ' ').trim();
            return cleaned.slice(0, 31) || 'Report';
          };

          const sanitizeFilename = (name: string) => {
            const base = name.toLowerCase().endsWith('.xlsx')
              ? `${name.split('.xlsx')[0]}_${new Date().getTime()}.xlsx`
              : `${name}_${new Date().getTime()}.xlsx`;
            return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
          };

          const isoDate = new Date().toISOString().slice(0, 10);
          const defaultName = `report_${process.env.PG_DATABASE || 'db'}_${isoDate}.xlsx`;

          const finalSheetName = sanitizeSheetName(sheetName);
          const finalFilename = sanitizeFilename(filename || defaultName);
          const objectKey = `reports/${process.env.PG_DATABASE || 'db'}/${finalFilename}`;

          // ---- Build workbook
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
          const buffer: Buffer = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'buffer',
          });

          // Check file size (limit to 50MB to avoid multipart upload issues)
          const fileSizeMB = buffer.length / (1024 * 1024);
          if (fileSizeMB > 50) {
            return `File too large (${fileSizeMB.toFixed(2)}MB). Please limit your query results to reduce file size.`;
          }

          // ---- Upload to S3
          const putObjectCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: buffer,
            ContentType:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            CacheControl: 'public, max-age=3600',
            ACL: 'public-read', // Make the file publicly readable
          });

          console.log(
            `Uploading to S3: ${objectKey} (${Math.round(buffer.length / 1024)}KB)`,
          );

          // Retry logic for S3 upload
          let uploadAttempts = 0;
          const maxRetries = 3;

          while (uploadAttempts < maxRetries) {
            try {
              await this.s3Client.send(putObjectCommand);
              console.log(`Successfully uploaded to S3: ${objectKey}`);
              break;
            } catch (uploadError: any) {
              uploadAttempts++;
              console.error(
                `S3 Upload attempt ${uploadAttempts} failed:`,
                uploadError.message,
              );

              if (uploadAttempts >= maxRetries) {
                throw new Error(
                  `S3 upload failed after ${maxRetries} attempts: ${uploadError.message}`,
                );
              }

              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, uploadAttempts) * 1000),
              );
            }
          }

          // ---- Get public URL (assuming bucket has public access configured)
          const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectKey}`;

          // Return structured response with both URL and filename
          return JSON.stringify({
            url: publicUrl,
            filename: finalFilename,
          });
        } catch (error: any) {
          console.error(`Excel export tool error: ${error?.stack || error}`);
          return `Failed to generate and upload Excel file to S3: ${error?.message || String(error)}`;
        }
      },
    });
  }

  private getTablesQuery(
    dbType: 'postgres' | 'mysql' | 'sqlite' | 'mssql',
  ): string {
    switch (dbType) {
      case 'postgres':
        return `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;
      case 'mysql':
        return `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        `;
      case 'sqlite':
        return `
          SELECT name as table_name 
          FROM sqlite_master 
          WHERE type = 'table'
        `;
      case 'mssql':
        return `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_type = 'BASE TABLE'
        `;
      default:
        return `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;
    }
  }

  private getTestQuery(
    dbType: 'postgres' | 'mysql' | 'sqlite' | 'mssql',
  ): string {
    switch (dbType) {
      case 'postgres':
      case 'mysql':
      case 'sqlite':
      case 'mssql':
        return 'SELECT 1 as test';
      default:
        return 'SELECT 1 as test';
    }
  }
}
