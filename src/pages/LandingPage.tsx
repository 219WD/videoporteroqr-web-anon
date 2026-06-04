import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeInfo, ScanLine, MessageCircleMore } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col px-4 py-4 sm:px-5">
      <Card className="overflow-hidden border-zinc-200">
        <CardHeader className="bg-gradient-to-b from-[#7d1522] to-[#65101c] text-white">
          <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">VideoPortero</Badge>
          <CardTitle className="text-[28px] text-white">Entrá al chat con un QR</CardTitle>
          <CardDescription className="text-white/80">
            Escaneá el código, escribí tu nombre y empezá una conversación directa con la otra persona.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-[#7d1522]" />
              Diseñado para usar desde el celular.
            </div>
            <div className="flex items-center gap-2">
              <MessageCircleMore className="h-4 w-4 text-[#7d1522]" />
              Todo el flujo queda en chat.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/qr/demo">
                Probar demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/qr/demo">
                <BadgeInfo className="h-4 w-4" />
                Ver cómo funciona
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
