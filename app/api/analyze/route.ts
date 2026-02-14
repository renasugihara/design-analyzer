// TODO: Implement analysis API (Task 7)
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: { type: 'analysis-failed', message: 'Not implemented', suggestion: 'Task 7 pending' } },
    { status: 501 }
  );
}
