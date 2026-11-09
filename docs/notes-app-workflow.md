# Building a basic notes flow

This walkthrough explains the reusable Novy widgets and logic used by the **Notes CRUD app**
starter. Selecting that starter provisions the screens, workflows, Notes Database, Notes
collection, and example records automatically; the same flow can also be assembled manually. It
runs in Editor Preview as a responsive **web** app. Production app generation and a remote database
are not connected yet.

## 1. Create a collection

When building manually, create a project database and a `Notes` collection with `Title` and
`Content` text fields. Mark Title required. The Notes starter performs this step automatically and
adds three example records.

## 2. Design the Home list

1. Add a ListView to Home. In its Inspector set **Data source** to **Collection** and choose
   `Notes`.
2. Choose **Edit item design**. Add a Gesture Detector containing the visual card and two Text
   widgets, plus a Dropdown for the independent overflow action.
3. Select the first Text widget. Under **Item data bindings**, set **Text content** to `Title`.
   Bind the second Text widget's **Text content** to `Content`. The ListView repeats this
   design for each record; no separate card needs to be created for each note.
4. Select the Dropdown, set **Presentation** to **Actions menu**, set its label to `Note actions`,
   and enter `Delete` under **Options**. Editing is exposed on the detail screen.
5. Add a button labeled `+` or `Add note` on Home. Its click workflow navigates to an Add Note
   screen. Use the geometry and appearance controls to style the button and cards.

## 3. Create a note

On Add Note, add Title and Description inputs and a Save button. In Save's click workflow:

1. Add **Insert to DB** and select the `Notes` collection.
2. In **Input mapping**, map each collection field to the matching input's **Component value**.
3. Connect the insert's **success** output to **Navigate** targeting Home. Connect **error** to a
   message if desired. The list updates automatically; do not add a separate local list item.

## 4. Open, edit, or delete a specific note

Give the card Gesture Detector an **On Click → Open current item** workflow targeting Note Detail.
Novy carries the current collection and record ID as route context, so detail Text widgets can bind
directly to the selected record's Title and Content fields.

Create an **On Change** workflow targeting the item template's actions menu. Add **Delete current
item**, enable confirmation, and use the automatic current-item ID mapping. The nested menu stops
the click from also opening Note Detail.

On Note Detail, add Edit and Delete buttons. Edit navigates to Edit Note while preserving
`route.recordId`; Delete maps that variable to **Delete from DB** and navigates Home on success.

On Edit Note, add Title and Content inputs and a Save button. Create an **On Load** workflow
targeting a component on that screen:

1. Add **Get Record**, select `Notes`, and map **Record ID** to `route.recordId`.
2. On its success output, add **Set Component Value** for the Title input. Map its value from the
   Get Record **Previous node output**, then choose the `Title` record field. Repeat for the
   Content input and its field.

For the Edit Save button, add **Update in DB**, select `Notes`, map **Record ID** to the same
variable, and map the two fields to the edit inputs. Connect **success** to Navigate Note Detail
with the same record context and handle **error** separately. Cancel returns to detail without a
write.

## 5. Add light/dark appearance

Add a Switch to the app, label it `Dark mode`, and enable **Control app light/dark theme** in its
Inspector. The switch changes the previewed app, not the Novy editor. Optional **Dark theme
colors** in a component's Appearance section override its base colors in dark mode; empty dark
fields inherit the base appearance. Theme choice lasts for the current Preview session.

## 6. Test safely in Preview

- By default, collection writes are isolated to the Preview session and disappear when it closes.
- To retain test records in this browser's project data, enable **Save data changes** before
  saving. This also permits update and delete actions to modify browser-local project records.
- Enabling persistence after making temporary preview changes asks before discarding those
  temporary records; it does not silently save them.
- Verify two notes show their own titles and descriptions, then edit and delete one and confirm
  the other remains unchanged. Check validation errors and both light and dark appearances.
