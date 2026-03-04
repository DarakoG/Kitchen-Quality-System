---
Task ID: 1
Agent: Main Agent
Task: Fix permissions system - make permissions persist and enforce UI restrictions

Work Log:
- Fixed race condition in permissions loading by passing user directly to loadPermissions function
- Updated permissions-store.ts to include default permissions as fallback and pass auth headers directly
- Modified AppShell.tsx to check permissions before rendering views
- Updated Sidebar.tsx to receive permissions as prop and filter menu items based on permissions
- Fixed TypeScript errors in /api/permissions/me/route.ts
- The PermissionsView already supports COMPANY_ADMIN role for Super Admin
- The API already supports company selection for Super Admin

Stage Summary:
- Permissions now persist to database via PUT /api/permissions endpoint
- Permissions are loaded on login and enforced in UI
- Super Admin can edit all roles (COMPANY_ADMIN, BRANCH_MANAGER, SUPERVISOR, AUDITOR)
- Super Admin can select which company to modify permissions for
- Company Admin can edit BRANCH_MANAGER, SUPERVISOR, AUDITOR roles for their company
- Default permissions are used as fallback when API call fails
