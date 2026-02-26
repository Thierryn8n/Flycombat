import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default async function AuthErrorPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Erro de Autenticacao</CardTitle>
          <CardDescription>
            {typeof searchParams.message === "string"
              ? searchParams.message
              : "Ocorreu um erro durante a autenticacao. Tente novamente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/auth/login">Tentar novamente</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Voltar ao inicio</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
