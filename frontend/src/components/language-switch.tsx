import { useTranslation } from "react-i18next";
import { Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitch() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: "zh", label: "中文", shortLabel: "中" },
    { code: "en", label: "English", shortLabel: "EN" },
  ];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="scale-95 rounded-full"
          title="切换语言 / Switch Language"
        >
          <Languages className="size-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
          >
            <span className="me-2 text-sm font-medium opacity-70">
              {lang.shortLabel}
            </span>
            {lang.label}
            <Check
              size={14}
              className={cn("ms-auto", currentLang !== lang.code && "hidden")}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
