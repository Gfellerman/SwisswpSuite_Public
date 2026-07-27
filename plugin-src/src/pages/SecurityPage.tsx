/**
 * Security Page — Phase 3 Migration Complete
 * Agent: debugger + backend-specialist
 * Wired to: SecurityHub (full live component)
 * Features: WAF toggles, deep scan, sentinel audit, IP banning, quarantine, hardening, geo-blocking
 */
import React from 'react';
import SecurityHub from '../components/SecurityHub';

export const SecurityPage: React.FC = () => {
    return <SecurityHub />;
};

export default SecurityPage;
