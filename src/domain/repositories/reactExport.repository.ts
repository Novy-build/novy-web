export interface ReactExportArchive {
  filename: string;
  content: ArrayBuffer;
}

export interface ReactExportRepository {
  readonly isAvailable: boolean;
  exportReact(manifest: unknown): Promise<ReactExportArchive>;
}
