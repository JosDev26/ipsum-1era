// src/app/api/login/route.js

import { NextResponse } from 'next/server';
import { serialize } from 'cookie';

export async function POST(request) {
    // Obtener los datos del formulario en JSON
    const formData = await request.json();
    console.log('Datos del formulario:', formData);

    // Hacer un POST a tu backend
    const backendResponse = await fetch('https://ipsum-backend.vercel.app/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    // Manejar la respuesta del backend si es necesario
    const backendData = await backendResponse.json();

    if (backendData.authorized) {
      if (backendData.newUser) {
        return NextResponse.json({toChange: true});
      } else{
        const response = NextResponse.json({ toHome: true, user: backendData.user });
        response.cookies.set('auth', 'true', { httpOnly: true, secure: false, maxAge: 60 * 60 * 24 });
        return response;
      }
    } else{
      return NextResponse.json({toError: true});
    }

    
}
