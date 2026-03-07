import { PartialType } from "@nestjs/swagger";
import { CreateEsignRecordDto } from "./create-esign-record.dto";

export class UpdateEsignRecordDto extends PartialType(CreateEsignRecordDto) {}
