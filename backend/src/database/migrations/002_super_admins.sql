-- Migration: 002_super_admins
-- Description: Create super_admins table for cross-tenant administration
-- Created: 2024

-- ============================================
-- SUPER ADMINS TABLE (Platform-level admins)
-- ============================================
-- Super admins have access to all tenants and can manage the entire platform
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '["all"]', -- Granular permissions if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_super_admins_email ON super_admins(email);
CREATE INDEX idx_super_admins_active ON super_admins(is_active);

-- Apply update trigger
CREATE TRIGGER update_super_admins_updated_at 
    BEFORE UPDATE ON super_admins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUPER ADMIN AUDIT LOG TABLE
-- ============================================
-- Track all super admin actions for security
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'tenant', 'user', etc.
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_super_admin_audit_admin ON super_admin_audit_log(super_admin_id);
CREATE INDEX idx_super_admin_audit_action ON super_admin_audit_log(action);
CREATE INDEX idx_super_admin_audit_created ON super_admin_audit_log(created_at DESC);
