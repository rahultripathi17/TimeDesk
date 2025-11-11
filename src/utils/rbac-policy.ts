export type Role = 'admin' | 'hr' | 'manager' | 'employee';

/**
 * Industry Standard Access Control Policy
 * Determines if a user with a given role is allowed to access a specific path.
 * 
 * @param path - The requested URL path
 * @param role - The user's role from database
 * @returns true if access is allowed, false otherwise
 */
export function checkAuthorization(path: string, role: string): boolean {
    const normalizedRole = role.toLowerCase();
    
    // Normalize path to handle both API and Page routes identically
    // e.g. /api/admin/users -> /admin/users
    const normalizedPath = path.startsWith('/api') ? path.replace('/api', '') : path;

    // 1. Admin Zone
    // Policy: Strictly for Admins, with specific shared module exceptions
    if (normalizedPath.startsWith('/admin')) {
        // Exception: Policy Management (Shared) - If applicable for HR in future
        if (normalizedPath.startsWith('/admin/policies')) {
             return ['admin', 'hr'].includes(normalizedRole);
        }

        // Exception: Reports & Analytics (Shared with HR)
        // HR needs access to these specific Admin APIs to power the HR Dashboard
        if (normalizedPath.startsWith('/admin/reports') || normalizedPath.startsWith('/admin/departments')) {
            return ['admin', 'hr'].includes(normalizedRole);
        }

        // Default Admin Rule: Strict Isolation
        return normalizedRole === 'admin';
    }

    // 2. HR Zone
    // Policy: Strictly for HR (and Admin superuser)
    if (normalizedPath.startsWith('/hr')) {
        return ['admin', 'hr'].includes(normalizedRole);
    }

    // 3. Manager Zone
    // Policy: Strictly for Managers (and Admin superuser)
    if (normalizedPath.startsWith('/manager')) {
        return ['admin', 'manager'].includes(normalizedRole);
    }

    // 4. Common Authenticated Zones (Dashboard, Leaves, etc.)
    // These are generally open to all authenticated roles
    return true;
}
