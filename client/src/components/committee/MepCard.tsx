import { Link } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { GROUP_COLORS } from "@shared/committees";

interface MepCardProps {
  epId: string;
  name: string;
  country: string;
  politicalGroup: string;
  photoUrl: string | null;
  role: string;
}

export default function MepCard({ epId, name, country, politicalGroup, photoUrl, role }: MepCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <Link href={`/mep/${epId}`}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
        <Avatar className="size-12">
          {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${GROUP_COLORS[politicalGroup] || "bg-gray-400"}`} />
            <span className="text-xs text-muted-foreground truncate">{politicalGroup}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{country}</span>
            {role !== "Member" && (
              <span className="text-[10px] px-1.5 py-px rounded bg-muted border border-border">{role}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
