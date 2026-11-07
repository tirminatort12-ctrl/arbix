import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGS, useT } from "@/lib/i18n";

export const LangSwitch = () => {
  const { lang, setLang } = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="lang-switch" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 text-sm font-bold text-[#1B4332] outline-none">
        <Globe className="h-4 w-4" />{lang.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[1200] bg-white">
        {Object.entries(LANGS).map(([k, v]) => (
          <DropdownMenuItem key={k} onClick={() => setLang(k)} data-testid={`lang-${k}`} className={k === lang ? "font-bold text-[#1B4332]" : ""}>{v}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
