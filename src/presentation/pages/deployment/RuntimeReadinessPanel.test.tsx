import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RuntimeReadinessPanel } from './RuntimeReadinessPanel';

describe('RuntimeReadinessPanel', () => {
  it('lists provider boundaries and exports the backend handoff', () => {
    const onExport = vi.fn();
    render(
      <RuntimeReadinessPanel
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

    fireEvent.click(screen.getByRole('button', { name: 'Export backend handoff' }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
