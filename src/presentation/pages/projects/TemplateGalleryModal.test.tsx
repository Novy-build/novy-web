import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Template } from '@domain/entities/template';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { TemplateGalleryModal } from './TemplateGalleryModal';

/**
 * Tile accessible names include the whole tile content, so queries match on
 * the template name as a substring.
 */
const BLANK_TILE_QUERY = { name: /^Blank(?! canvas)/ } as const;
const STUDENT_TILE_QUERY = { name: /Student list/ } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

interface RenderGalleryOptions {
  templates?: readonly Template[];
}

function renderGallery(options: RenderGalleryOptions = {}) {
  const onCancel = vi.fn();
  const onCreate = vi.fn().mockResolvedValue(undefined);
  render(
    <TemplateGalleryModal
      onCancel={onCancel}
      onCreate={onCreate}
      templates={options.templates ?? TEMPLATE_CATALOG}
    />,
  );
  return { onCancel, onCreate };
}

describe('TemplateGalleryModal', () => {
  it('renders every starter template as a selectable tile', () => {
    renderGallery();

    expect(screen.getByRole('heading', { name: 'Choose a starting template' })).toBeInTheDocument();
    expect(within(screen.getByTestId('template-grid')).getAllByRole('button')).toHaveLength(
      TEMPLATE_CATALOG.length,
    );
  });

  it('uses a viewport-safe responsive gallery layout', () => {
    renderGallery();

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100dvh-2rem)]', 'max-w-4xl');
    expect(screen.getByTestId('template-grid')).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-3',
    );
  });

  it('starts with the first template selected', () => {
    renderGallery();

    expect(screen.getByRole('button', BLANK_TILE_QUERY)).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the project name when the user has not typed one yet', () => {
    renderGallery();

    fireEvent.click(screen.getByRole('button', STUDENT_TILE_QUERY));

    expect(screen.getByLabelText('Project name')).toHaveValue('Student list');
  });

  it('keeps an edited name when switching templates', () => {
    renderGallery();

    const nameInput = screen.getByLabelText('Project name');
    fireEvent.change(nameInput, { target: { value: 'My app' } });
    fireEvent.click(screen.getByRole('button', STUDENT_TILE_QUERY));

    expect(nameInput).toHaveValue('My app');
  });

  it('blocks creation with an empty name', () => {
    const { onCreate } = renderGallery();

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a project name.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('creates through onCreate with the selected template', async () => {
    const { onCreate } = renderGallery();

    fireEvent.click(screen.getByRole('button', STUDENT_TILE_QUERY));
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Pimped landing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toBe('Pimped landing');
    expect(onCreate.mock.calls[0][1]).toMatchObject({ id: 'template_students' });
  });

  it('shows a failure message when creation throws', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('boom'));
    render(<TemplateGalleryModal onCancel={vi.fn()} onCreate={onCreate} templates={TEMPLATE_CATALOG} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not create the project');
  });

  it('cancels through the cancel action', () => {
    const { onCancel } = renderGallery();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('moves the pressed state when another tile is selected', () => {
    renderGallery();

    fireEvent.click(screen.getByRole('button', STUDENT_TILE_QUERY));

    expect(screen.getByRole('button', STUDENT_TILE_QUERY)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', BLANK_TILE_QUERY)).toHaveAttribute('aria-pressed', 'false');
  });
});
