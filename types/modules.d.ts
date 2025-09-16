declare module "tsup" {
  export type Options = Record<string, unknown>;
  export function defineConfig(config: Options | Options[]): Options | Options[];
  const defaultExport: unknown;
  export default defaultExport;
}

declare module "@libsql/database" {
  export interface ClientOptions {
    url: string;
    authToken?: string;
  }
  export class Client {
    constructor(config: ClientOptions);
    execute<T = unknown>(query: string, params?: unknown[]): Promise<T>;
    close(): Promise<void>;
  }
  export function createClient(config: ClientOptions): Client;
}

declare module "dotenv" {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
  }
  export interface DotenvConfigOutput {
    parsed?: Record<string, string>;
    error?: Error;
  }
  export function config(options?: DotenvConfigOptions): DotenvConfigOutput;
}
