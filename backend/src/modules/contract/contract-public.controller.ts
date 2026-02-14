import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ContractService } from "./contract.service";
import { QueryContractDto } from "./dto/query-contract.dto";

@ApiTags("public-contracts")
@Controller("public/contracts")
export class ContractPublicController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @ApiOperation({
    summary: "Get completed contracts (cases) for public display",
  })
  findCompletedContracts(@Query() query: QueryContractDto) {
    // 仅返回已收全款的合同作为案例展示
    return this.contractService.findAll({
      ...query,
      status: "PAID",
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get contract detail by id for public display" })
  findOne(@Param("id") id: string) {
    return this.contractService.findOne(id);
  }
}
