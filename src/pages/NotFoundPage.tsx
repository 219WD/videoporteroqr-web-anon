import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] items-center px-4 py-4 sm:px-5">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f7f2f3] text-[#7d1522]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>Pagina no encontrada</CardTitle>
          <CardDescription>Verificá el QR o volvé al inicio.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-5">
          <Button asChild variant="secondary">
            <Link to="/">Volver</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
