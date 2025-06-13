# Authorization & Multi-Tenancy Implementation Plan

## Overview

This document outlines the comprehensive plan for implementing authorization and multi-tenancy features in the ActionBias MCP server. The implementation will transform the current single-tenant system into a secure, multi-tenant platform with role-based access control.

## Phase 1: Core Authentication & Data Model (High Priority)

### 1. **Multi-Tenant Database Schema Design**

```sql
-- Users table
users (
  id: uuid PRIMARY KEY,
  email: string UNIQUE,
  password_hash: string,
  name: string,
  created_at: timestamp,
  updated_at: timestamp
)

-- Organizations (tenants)
organizations (
  id: uuid PRIMARY KEY,
  name: string,
  slug: string UNIQUE,
  created_at: timestamp,
  updated_at: timestamp
)

-- User-Organization memberships with roles
user_organizations (
  user_id: uuid REFERENCES users(id),
  organization_id: uuid REFERENCES organizations(id),
  role: enum('owner', 'admin', 'member', 'viewer'),
  created_at: timestamp,
  PRIMARY KEY (user_id, organization_id)
)

-- Update actions table for tenant isolation
actions (
  id: uuid PRIMARY KEY,
  organization_id: uuid REFERENCES organizations(id), -- NEW
  created_by: uuid REFERENCES users(id), -- NEW
  data: jsonb,
  done: boolean,
  version: integer,
  created_at: timestamp,
  updated_at: timestamp
)
```

### 2. **JWT Authentication System**
- Implement secure JWT token generation/validation
- Add refresh token mechanism
- Store user context (user_id, organization_id, role) in tokens
- Implement password hashing with bcrypt

### 3. **Role-Based Authorization (RBAC)**

```typescript
enum Role {
  OWNER = 'owner',     // Full access, can delete org
  ADMIN = 'admin',     // Manage users, full action access
  MEMBER = 'member',   // Create/edit own actions, view all
  VIEWER = 'viewer'    // Read-only access
}

// Permission matrix
const permissions = {
  'actions.create': ['owner', 'admin', 'member'],
  'actions.update.own': ['owner', 'admin', 'member'],
  'actions.update.any': ['owner', 'admin'],
  'actions.delete.own': ['owner', 'admin', 'member'],
  'actions.delete.any': ['owner', 'admin'],
  'actions.view': ['owner', 'admin', 'member', 'viewer'],
  'users.invite': ['owner', 'admin'],
  'users.manage': ['owner', 'admin'],
  'org.settings': ['owner', 'admin'],
}
```

## Phase 2: API & Service Layer Updates (High Priority)

### 4. **Tenant-Scoped Data Access**

```typescript
// Update ActionsService with tenant context
class ActionsService {
  static async createAction(params: CreateActionParams, context: UserContext) {
    // Validate user has permission in their organization
    // Automatically set organization_id and created_by
  }
  
  static async listActions(params: ListActionsParams, context: UserContext) {
    // Filter by organization_id automatically
    // Apply role-based visibility rules
  }
}

interface UserContext {
  userId: string;
  organizationId: string;
  role: Role;
  permissions: string[];
}
```

### 5. **Authentication Endpoints**

```typescript
// New API routes needed:
POST /api/auth/register    // User registration
POST /api/auth/login       // User login  
POST /api/auth/logout      // Token invalidation
POST /api/auth/refresh     // Token refresh
GET  /api/auth/me          // Current user info

POST /api/organizations    // Create organization
GET  /api/organizations    // List user's orgs
PUT  /api/organizations/:id // Update org
POST /api/organizations/:id/invite // Invite user
DELETE /api/organizations/:id/users/:userId // Remove user
```

## Phase 3: MCP Integration & Security (Medium Priority)

### 6. **Enhanced MCP Authentication**
- Update MCP auth to validate JWT tokens instead of simple bearer tokens
- Add organization context to MCP tool calls
- Implement user session management for long-running MCP connections

### 7. **Audit Logging & Security**

```typescript
// Audit log table
audit_logs (
  id: uuid PRIMARY KEY,
  organization_id: uuid,
  user_id: uuid,
  action: string,        // 'action.created', 'user.invited', etc.
  resource_type: string, // 'action', 'user', 'organization'
  resource_id: uuid,
  details: jsonb,        // Additional context
  ip_address: string,
  user_agent: string,
  created_at: timestamp
)
```

## Phase 4: Advanced Features (Medium Priority)

### 8. **Organization Management**
- Organization settings and branding
- Usage limits and billing preparation
- Team management interfaces
- Invitation system with email notifications

### 9. **Data Migration Strategy**

```typescript
// Migration plan for existing data:
// 1. Create default organization for existing actions
// 2. Assign all existing actions to default org
// 3. Create admin user for each organization
// 4. Update all queries to be tenant-aware
```

## Implementation Order & Dependencies

### Sprint 1 (Foundation)
1. Design and implement new database schema
2. Create JWT authentication system
3. Add basic user registration/login endpoints
4. Implement authorization middleware

### Sprint 2 (Core Integration)  
5. Update ActionsService for tenant scoping
6. Migrate existing data to multi-tenant model
7. Update all existing API routes for authorization
8. Add basic organization management

### Sprint 3 (MCP & Polish)
9. Update MCP authentication system
10. Implement audit logging
11. Add comprehensive test coverage
12. Documentation and security review

## Security Considerations

- **Token Security**: Short-lived access tokens (15min) with secure refresh tokens
- **Password Policy**: Minimum complexity requirements
- **Rate Limiting**: Prevent brute force attacks on auth endpoints  
- **HTTPS Only**: Enforce secure connections in production
- **Input Validation**: Sanitize all user inputs
- **Audit Trail**: Log all sensitive operations
- **Tenant Isolation**: Ensure strict data separation between organizations

## Decision Points & Questions

1. **Authentication Provider**: Do you want to build custom auth or integrate with OAuth providers (Google, GitHub, etc.)?

2. **Organization Model**: Should users be able to belong to multiple organizations? Or one organization per user?

3. **Pricing Model**: Will different organizations have different feature limits that we need to enforce?

4. **Migration**: Do you want to preserve existing test data or start fresh?

5. **MCP Integration**: Should MCP connections be tied to specific users or remain at the organization level?

## Technical Implementation Notes

### Database Migrations
- All existing actions will need to be migrated to include `organization_id` and `created_by` fields
- Foreign key constraints will need to be added carefully to avoid data loss
- Consider using a default organization for existing data during migration

### API Versioning
- Consider implementing API versioning to maintain backward compatibility during the transition
- Legacy endpoints could continue to work for existing integrations while new endpoints require authentication

### Performance Considerations
- Add database indexes on `organization_id` for all tenant-scoped queries
- Consider implementing connection pooling for multi-tenant database access
- Plan for horizontal scaling as organizations grow

### Testing Strategy
- Unit tests for authentication and authorization logic
- Integration tests for tenant data isolation
- Security tests for common vulnerabilities (SQL injection, XSS, etc.)
- Load testing for multi-tenant scenarios

---

This plan provides a solid foundation for production-ready authorization and multi-tenancy. The phased approach ensures that critical security features are implemented first while maintaining system stability throughout the transition.