// src/app/api/login/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  return NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
});
}