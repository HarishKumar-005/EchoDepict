import { Music4 } from 'lucide-react';
import { ThemeToggle } from '../theme-toggle';

export function Header() {
  return (
    <header className="px-4 py-3 lg:px-6 lg:py-3 border-b border-border/10 flex items-center justify-between shrink-0 bg-transparent">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Music4 className="h-6 w-6 text-primary" style={{ filter: 'drop-shadow(0 0 5px hsl(var(--primary)/0.7))' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 8px hsl(var(--primary)/0.3)' }}>EchoDepict</h1>
          <p className="text-xs text-muted-foreground -mt-0.5">The AI Multi-Agent Aural Intelligence System</p>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
