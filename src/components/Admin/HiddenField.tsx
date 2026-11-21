/**
 * Renders nothing in the edit form. For a field another component already
 * shows (the order snapshot, shown by OrderSummary): unlike `admin.hidden` it
 * keeps the field's list column, and unlike `admin.condition` it leaves the
 * column's NOT NULL in place, since the Postgres adapter drops it for any
 * conditional field.
 */
export const HiddenField = () => null
