import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/adapter';
import { waitlist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Request validation schema
const waitlistRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  source: z.string().optional().default('homepage'),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = waitlistRequestSchema.parse(body);
    
    // Get database instance
    const db = getDb();
    
    // Check if email already exists
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, validatedData.email))
      .limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Email already registered',
          alreadyRegistered: true 
        },
        { status: 200 }
      );
    }
    
    // Insert new email
    const [newEntry] = await db
      .insert(waitlist)
      .values({
        email: validatedData.email,
        source: validatedData.source,
        metadata: validatedData.metadata,
      })
      .returning();
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully added to waitlist',
        id: newEntry.id 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Waitlist signup error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format',
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add to waitlist' 
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check waitlist stats (protected in production)
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // In production, you'd want to protect this endpoint
    // For now, just return the count
    const result = await db
      .select({ count: waitlist.email })
      .from(waitlist);
    
    const count = result.length;
    
    return NextResponse.json({
      success: true,
      count,
      message: `${count} emails in waitlist`
    });
    
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch waitlist data' 
      },
      { status: 500 }
    );
  }
}