/**
 * Empty on purpose. This takes Payload's `logout.Button` slot at the bottom of
 * the sidebar — where the stock nav renders a bare log-out icon — so the slot
 * stays free of any user control: the staff chip moved to the header's
 * top-right corner (`admin.avatar` → `src/components/Admin/UserMenu`) and one
 * user control is enough.
 */
const NoSidebarLogout: React.FC = () => null

export default NoSidebarLogout
