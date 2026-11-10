import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactExportRepository } from '@domain/repositories/reactExport.repository';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createStubRepositories } from '@test/stubRepositories';
import { useReactExport } from './useReactExport';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useReactExport', () => {
  it('downloads the generated ZIP with the backend filename', async () => {
    const content = new Uint8Array([80, 75, 3, 4]).buffer;
    const exportReact = vi.fn<ReactExportRepository['exportReact']>().mockResolvedValue({
      filename: 'notes-react.zip',
      content,
    });
    const repositories = {
      ...createStubRepositories(),
      reactExport: { isAvailable: true, exportReact },
    };
    const createObjectURL = vi.fn().mockReturnValue('blob:novy-export');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    render(
      <RepositoriesProvider repositories={repositories}>
        <Harness />
      </RepositoriesProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(exportReact).toHaveBeenCalledWith({ manifestVersion: 2 }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:novy-export');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

function Harness() {
  const reactExport = useReactExport({ manifestVersion: 2 });
  return (
    <div>
      <button onClick={() => void reactExport.download()} type="button">
        Download
      </button>
      {reactExport.error ? <p role="alert">{reactExport.error}</p> : null}
    </div>
  );
}
