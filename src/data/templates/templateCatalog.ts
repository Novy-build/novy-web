import type { ComponentNode } from '@domain/entities/componentNode';
import { createPadding } from '@domain/entities/componentNode';
import type { Template } from '@domain/entities/template';
import type { Behavior, LogicGraph } from '@domain/entities/logic';
import type { Screen } from '@domain/entities/screen';
import { NOTES_TEMPLATE } from './notesTemplate';

/*
 * Starter templates for the New Project gallery.
 * Ids are deterministic (not factory-generated) so templates stay stable in
 * snapshots; projects get fresh screen ids on creation.
 */

const EMPTY_BEHAVIORS: Behavior[] = [];
const EMPTY_GRAPHS: LogicGraph[] = [];

function screen(id: string, name: string, nodes: ComponentNode[]): Screen {
  return { id, name, path: name === 'Home' ? '/' : `/${name.toLowerCase().replace(/\s+/g, '-')}`, nodes, behaviors: EMPTY_BEHAVIORS, logicGraphs: EMPTY_GRAPHS };
}

const BLANK: Template = {
  id: 'template_blank',
  name: 'Blank',
  description: 'Start from an empty screen and drag your own components in.',
  screens: [screen('screen_blank_home', 'Home', [])],
};

const LANDING: Template = {
  id: 'template_landing',
  name: 'Landing page',
  description: 'A classic hero + call to action for products and services.',
  screens: [
    screen('screen_landing_home', 'Home', [
      {
        id: 'landing_image',
        type: 'image',
        x: 50,
        y: 60,
        w: 290,
        h: 170,
        props: { src: '', alt: 'Hero image', fit: 'cover' },
      },
      {
        id: 'landing_headline',
        type: 'text',
        x: 50,
        y: 250,
        w: 290,
        h: 72,
        props: { text: 'Grow your business with Novy', level: 'display' },
      },
      {
        id: 'landing_support',
        type: 'text',
        x: 50,
        y: 330,
        w: 270,
        h: 48,
        props: {
          text: 'Build, preview and publish your idea in minutes — no code required.',
          level: 'body',
        },
      },
      {
        id: 'landing_cta',
        type: 'button',
        x: 50,
        y: 400,
        w: 290,
        h: 48,
        props: { label: 'Get started', variant: 'solid' },
      },
      {
        id: 'landing_secondary_cta',
        type: 'button',
        x: 50,
        y: 458,
        w: 290,
        h: 48,
        props: { label: 'Learn more', variant: 'outline' },
      },
    ]),
  ],
};

const LOGIN_FORM: Template = {
  id: 'template_login',
  name: 'Login form',
  description: 'A ready-made sign-in screen to connect to your backend later.',
  screens: [
    screen('screen_login_home', 'Sign in', [
      {
        id: 'login_title',
        type: 'text',
        x: 50,
        y: 120,
        w: 290,
        h: 36,
        props: { text: 'Welcome back', level: 'display' },
      },
      {
        id: 'login_subtitle',
        type: 'text',
        x: 50,
        y: 162,
        w: 270,
        h: 24,
        props: { text: 'Use your email to continue.', level: 'body' },
      },
      {
        id: 'login_email',
        type: 'input',
        x: 50,
        y: 218,
        w: 290,
        h: 64,
        props: { label: 'Email', placeholder: 'you@example.com', inputType: 'email', multiline: false },
      },
      {
        id: 'login_password',
        type: 'input',
        x: 50,
        y: 292,
        w: 290,
        h: 64,
        props: { label: 'Password', placeholder: '••••••••', inputType: 'password', multiline: false },
      },
      {
        id: 'login_submit',
        type: 'button',
        x: 50,
        y: 376,
        w: 290,
        h: 48,
        props: { label: 'Sign in', variant: 'solid' },
      },
    ]),
  ],
};

const STUDENT_LIST: Template = {
  id: 'template_students',
  name: 'Student list',
  description: 'A directory screen — the example app from the product spec.',
  screens: [
    screen('screen_students_home', 'Home', [
      {
        id: 'students_title',
        type: 'text',
        x: 50,
        y: 72,
        w: 250,
        h: 36,
        props: { text: 'Student Directory', level: 'display' },
      },
      {
        id: 'students_hint',
        type: 'text',
        x: 50,
        y: 116,
        w: 270,
        h: 24,
        props: { text: 'Everyone enrolled this term.', level: 'body' },
      },
      {
        id: 'students_list',
        type: 'listview',
        x: 50,
        y: 164,
        w: 290,
        h: 260,
        props: {
          emptyText: 'No students yet.',
          showDividers: true,
          scrollDirection: 'vertical',
          crossAxisAlignment: 'stretch',
          gap: 0,
          padding: createPadding(0),
          itemSpacing: 0,
          itemBorderRadius: 0,
          dataSource: {
            kind: 'static',
            fields: [{ id: 'value', label: 'Student name', type: 'text' }],
            items: ['Bañares, Peter Andrew', 'Briñas, Andrei', 'Muñoz, Carl'].map((value, index) => ({
              id: `student-${index + 1}`,
              values: { value },
            })),
          },
        },
        children: [{
          id: 'students_list_item',
          type: 'text',
          x: 0,
          y: 0,
          w: 290,
          h: 44,
          props: { text: 'Student', level: 'body' },
          bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'value' } }],
        }],
      },
      {
        id: 'students_add',
        type: 'button',
        x: 50,
        y: 444,
        w: 290,
        h: 44,
        props: { label: 'Add student', variant: 'solid' },
      },
    ]),
  ],
};

export const TEMPLATE_CATALOG: readonly Template[] = [BLANK, LANDING, LOGIN_FORM, STUDENT_LIST, NOTES_TEMPLATE];
