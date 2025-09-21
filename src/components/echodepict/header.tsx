import { Music4 } from 'lucide-react';

export function Header() {
  return (
    <header className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Music4 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">EchoDepict</h1>
          <p className="text-xs text-muted-foreground -mt-0.5">The AI Multi-Agent Aural Intelligence System</p>
        </div>
      </div>
    </header>
  );
}
