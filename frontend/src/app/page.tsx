import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            Shadcn UI Ready
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Tinyfish Frontend
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            This project is configured with Next.js, Tailwind CSS, and shadcn/ui.
            Start building components in a production-ready foundation.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Component Playground</CardTitle>
              <CardDescription>
                Verify basic shadcn components are installed and working.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Search alerts, advisories, or symbols" />
              <div className="flex gap-2">
                <Button>Primary Action</Button>
                <Button variant="outline">Secondary</Button>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Edit this page at src/app/page.tsx.
              </p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>
                Add more UI blocks using the shadcn CLI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>npx shadcn@latest add dialog</li>
                <li>npx shadcn@latest add table</li>
                <li>npx shadcn@latest add form</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
