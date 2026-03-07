import { PartialType } from "@nestjs/swagger";
import { CreateServiceTeamDto } from "./create-service-team.dto";

export class UpdateServiceTeamDto extends PartialType(CreateServiceTeamDto) {}
