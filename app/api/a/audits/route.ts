import { NextRequest, NextResponse } from 'next/server';

// Example: In-memory audit log (replace with DB in production)
let auditLogs: Array<{
    timestamp: string;
    user: string;
    action: string;
    details?: any;
}> = [];

// Helper to record an audit event
function recordAudit(user: string, action: string, details?: any) {
    auditLogs.push({
        timestamp: new Date().toISOString(),
        user,
        action,
        details,
    });
}

// GET: Retrieve audit logs
export async function GET(req: NextRequest) {
    // In production, add authentication/authorization here
    return NextResponse.json(auditLogs);
}

// POST: Record a new audit event
export async function POST(req: NextRequest) {
    const { user, action, details } = await req.json();

    if (!user || !action) {
        return NextResponse.json({ error: 'Missing user or action' }, { status: 400 });
    }

    recordAudit(user, action, details);

    return NextResponse.json({ success: true });
}

// DELETE: Clear audit logs (for demonstration; use with caution)
export async function DELETE(req: NextRequest) {
    // In production, add authentication/authorization here
    
    auditLogs = [];
    return NextResponse.json({ success: true });
}