import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plane, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-background" />
          </div>
          <CardTitle className="text-xl">Verifique seu Email</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para o seu email. Clique nele para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/login">Ir para Login</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Voltar ao inicio</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
