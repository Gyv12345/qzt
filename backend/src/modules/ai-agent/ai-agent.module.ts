import { Module } from "@nestjs/common";
import { AiAgentController } from "./ai-agent.controller";
import { ZhipuProvider } from "./providers/zhipu.provider";
import { IntentParserService } from "./services/intent-parser.service";
import { EntityExtractorService } from "./services/entity-extractor.service";
import { ActionExecutorService } from "./services/action-executor.service";
import { SessionManagerService } from "./services/session-manager.service";
import { MessageHandlerService } from "./services/message-handler.service";
import { WechatUserMappingService } from "./services/wechat-user-mapping.service";
import { WeworkSignatureGuard } from "./guards/wework-signature.guard";
import { CustomerModule } from "../customer/customer.module";
import { FollowRecordModule } from "../follow-record/follow-record.module";
import { ContractModule } from "../contract/contract.module";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [CustomerModule, FollowRecordModule, ContractModule, PaymentModule],
  controllers: [AiAgentController],
  providers: [
    ZhipuProvider,
    IntentParserService,
    EntityExtractorService,
    ActionExecutorService,
    SessionManagerService,
    MessageHandlerService,
    WechatUserMappingService,
    WeworkSignatureGuard,
  ],
  exports: [
    MessageHandlerService,
    ZhipuProvider,
    WechatUserMappingService,
    WeworkSignatureGuard,
  ],
})
export class AiAgentModule {}
