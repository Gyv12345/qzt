import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { CustomerRulesCards } from "./components/customer-rules-cards";

function CustomerRulesContent() {
  const { t } = useTranslation();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("customerRule.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("customerRule.description")}
          </p>
        </div>
      </div>
      <CustomerRulesCards />
    </Main>
  );
}

export function CustomerRules() {
  return <CustomerRulesContent />;
}
