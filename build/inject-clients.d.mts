export interface InjectClientsResult {
  success: boolean;
  totalClients: number;
  homeStripCount: number;
  homeNamesCount: number;
  logoGridCount: number;
  nameListCount: number;
  updatedFiles: string[];
}

export function injectClients(options?: {
  rootDir?: string;
  databaseUrl?: string;
}): Promise<InjectClientsResult>;
