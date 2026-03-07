import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

type ContentSectionProps = {
  title: string;
  desc: string;
  children: React.JSX.Element;
  headerContent?: React.ReactNode;
};

export function ContentSection({
  title,
  desc,
  children,
  headerContent,
}: ContentSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-none">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{t(title)}</h3>
            <p className="text-sm text-muted-foreground">{t(desc)}</p>
          </div>
          {headerContent && <div className="ml-4">{headerContent}</div>}
        </div>
      </div>
      <Separator className="my-4 flex-none" />
      <div className="faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12">
        <div className="-mx-1 px-1.5 lg:max-w-xl">{children}</div>
      </div>
    </div>
  );
}
