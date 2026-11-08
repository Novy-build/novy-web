# Building a basic notes flow

This walkthrough uses reusable Novy widgets and logic; it does not require the existing advanced
notes starter. The result runs in Editor Preview as a responsive **web** app. Production app
generation and a remote database are not connected yet.

## 1. Create a collection

In the Data workspace, create a project database and a `Notes` collection with text fields such as
`Title` and `Description`. Mark fields required if they must not be empty. Field labels are shown in
the editor; the generated field IDs are used internally in saved project data.

## 2. Design the Home list

1. Add a ListView to Home. In its Inspector set **Data source** to **Collection** and choose
   `Notes`.
2. Choose **Edit item design**. Add a Row containing a Column and a Dropdown. Put two Text widgets
   inside the Column.
3. Select the first Text widget. Under **Item data bindings**, set **Text content** to `Title`.
   Bind the second Text widget's **Text content** to `Description`. The ListView repeats this
   design for each record; no separate card needs to be created for each note.
4. Select the Dropdown, set **Presentation** to **Actions menu**, set its label to `Note actions`,
   and enter `Edit` and `Delete` on separate lines under **Options**.
5. Add a button labeled `+` or `Add note` on Home. Its click workflow navigates to an Add Note
   screen. Use the geometry and appearance controls to style the button and cards.

## 3. Create a note

On Add Note, add Title and Description inputs and a Save button. In Save's click workflow:

1. Add **Insert to DB** and select the `Notes` collection.
2. In **Input mapping**, map each collection field to the matching input's **Component value**.
3. Connect the insert's **success** output to **Navigate** targeting Home. Connect **error** to a
   message if desired. The list updates automatically; do not add a separate local list item.

## 4. Edit or delete a specific note

Create an **On Change** workflow targeting the item template's actions menu. Add **If / Else**,
choose the menu as its source component, and compare its value to `Edit`:

- **True:** Add **Set Variable**, name it `selectedNoteId`, and map its value to **Current list
  item → Current item ID**. Navigate to an Edit Note screen.
- **False:** For a menu with only Edit and Delete, add **Delete from DB**, select `Notes`, and map
  its **Record ID** to **Current list item → Current item ID**. Enable **Confirm before deleting**.
  A successful delete updates the list; cancellation or failure follows the error output.

On Edit Note, add Title and Description inputs and a Save button. Create an **On Load** workflow
targeting a component on that screen:

1. Add **Get Record**, select `Notes`, and map **Record ID** to the application variable
   `selectedNoteId`.
2. On its success output, add **Set Component Value** for the Title input. Map its value from the
   Get Record **Previous node output**, then choose the `Title` record field. Repeat for the
   Description input and its field.

For the Edit Save button, add **Update in DB**, select `Notes`, map **Record ID** to the same
variable, and map the two fields to the edit inputs. Connect **success** to Navigate Home and
handle **error** separately. Keep a Cancel button as a Navigate Home action without a write.

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
