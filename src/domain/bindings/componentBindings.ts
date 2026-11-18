import type { DataFieldType, DataValue, ListItemContext } from '../entities/appData';
import type {
  ComponentBindingTarget,
  ComponentNode,
  ComponentPropertyBinding,
  ComponentType,
} from '../entities/componentNode';

export interface ComponentBindingTargetDefinition {
  target: ComponentBindingTarget;
  componentTypes: readonly ComponentType[] | 'all';
  fieldTypes: readonly DataFieldType[];
}

export const COMPONENT_BINDING_TARGETS: readonly ComponentBindingTargetDefinition[] = [
  { target: 'text.content', componentTypes: ['text'], fieldTypes: ['text', 'number', 'boolean', 'date'] },
  { target: 'image.source', componentTypes: ['image'], fieldTypes: ['text'] },
  { target: 'image.alt', componentTypes: ['image'], fieldTypes: ['text'] },
  { target: 'button.label', componentTypes: ['button'], fieldTypes: ['text', 'number'] },
  { target: 'input.value', componentTypes: ['input'], fieldTypes: ['text', 'number', 'date'] },
  { target: 'dropdown.value', componentTypes: ['dropdown'], fieldTypes: ['text', 'number', 'date'] },
  { target: 'checkbox.checked', componentTypes: ['checkbox'], fieldTypes: ['boolean'] },
  { target: 'switch.checked', componentTypes: ['switch'], fieldTypes: ['boolean'] },
  { target: 'progress.value', componentTypes: ['progress'], fieldTypes: ['number'] },
  { target: 'component.visible', componentTypes: 'all', fieldTypes: ['boolean'] },
] as const;

export function bindingDefinition(
  target: ComponentBindingTarget,
): ComponentBindingTargetDefinition {
  return COMPONENT_BINDING_TARGETS.find((definition) => definition.target === target)!;
}

export function bindingTargetsForComponent(type: ComponentType): readonly ComponentBindingTargetDefinition[] {
  return COMPONENT_BINDING_TARGETS.filter(
    (definition) => definition.componentTypes === 'all' || definition.componentTypes.includes(type),
  );
}

export function isBindingTargetAllowed(type: ComponentType, target: ComponentBindingTarget): boolean {
  const definition = bindingDefinition(target);
  return definition.componentTypes === 'all' || definition.componentTypes.includes(type);
}

export function isFieldTypeCompatible(target: ComponentBindingTarget, type: DataFieldType): boolean {
  return bindingDefinition(target).fieldTypes.includes(type);
}

export function findComponentBinding(
  node: ComponentNode,
  target: ComponentBindingTarget,
): ComponentPropertyBinding | undefined {
  return node.bindings?.find((binding) => binding.target === target);
}

export function resolveBoundValue(
  node: ComponentNode,
  target: ComponentBindingTarget,
  item: ListItemContext | undefined,
  fallback: DataValue,
): DataValue {
  const binding = findComponentBinding(node, target);
  if (!binding || !item) return fallback;
  const value = item.values[binding.value.fieldId];
  if (value === undefined || value === null || !isRuntimeValueCompatible(target, value)) return fallback;
  return value;
}

export function resolveBoundText(
  node: ComponentNode,
  target: Extract<ComponentBindingTarget, 'text.content' | 'image.source' | 'image.alt' | 'button.label' | 'input.value' | 'dropdown.value'>,
  item: ListItemContext | undefined,
  fallback: string,
): string {
  return String(resolveBoundValue(node, target, item, fallback));
}

export function resolveBoundBoolean(
  node: ComponentNode,
  target: Extract<ComponentBindingTarget, 'checkbox.checked' | 'switch.checked' | 'component.visible'>,
  item: ListItemContext | undefined,
  fallback: boolean,
): boolean {
  const value = resolveBoundValue(node, target, item, fallback);
  return typeof value === 'boolean' ? value : fallback;
}

export function resolveBoundNumber(
  node: ComponentNode,
  target: Extract<ComponentBindingTarget, 'progress.value'>,
  item: ListItemContext | undefined,
  fallback: number,
): number {
  const value = resolveBoundValue(node, target, item, fallback);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRuntimeValueCompatible(target: ComponentBindingTarget, value: DataValue): boolean {
  switch (target) {
    case 'checkbox.checked':
    case 'switch.checked':
    case 'component.visible':
      return typeof value === 'boolean';
    case 'progress.value':
      return typeof value === 'number' && Number.isFinite(value);
    case 'image.source':
    case 'image.alt':
      return typeof value === 'string';
    case 'button.label':
    case 'input.value':
    case 'dropdown.value':
      return typeof value === 'string' || typeof value === 'number';
    case 'text.content':
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }
}
