import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RuntimeReadinessPanel } from './RuntimeReadinessPanel';

describe('RuntimeReadinessPanel', () => {
  it('lists provider boundaries and exports the backend handoff', () => {
    const onExport = vi.fn();
    const onDownloadReact = vi.fn();
    render(
      <RuntimeReadinessPanel
        downloadError={null}
        isDownloading={false}
        onDownloadReact={onDownloadReact}
        onExport={onExport}
        requirements={[
          { capability: 'camera', configurationOwner: 'browser', requiredBinding: 'browser.camera-permission', requiredBy: ['camera_1'] },
          { capability: 'computer-vision', configurationOwner: 'backend', requiredBinding: 'vision.biometrics', requiredBy: ['verify_1'] },
        ]}
      />,
    );

    expect(screen.getByText('Browser camera permission')).toBeInTheDocument();
    expect(screen.getByText('Computer Vision / biometrics')).toBeInTheDocument();
    expect(screen.getByText('Browser permission')).toBeInTheDocument();
    expect(screen.getByText('Backend required')).toBeInTheDocument();
    expect(screen.getByText(/client workflows and the secure Novy runtime client/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download React app' }));
    expect(onDownloadReact).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Export backend handoff' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('shows generation progress and an export error', () => {
    render(
      <RuntimeReadinessPanel
        downloadError="The project manifest is invalid."
        isDownloading
        onDownloadReact={vi.fn()}
        onExport={vi.fn()}
        requirements={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Generating React app…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('The project manifest is invalid.');
  });
});
