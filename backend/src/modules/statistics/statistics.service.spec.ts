import { Test, TestingModule } from "@nestjs/testing";
import { StatisticsService } from "./statistics.service";
import { PrismaService } from "@/common/prisma/prisma.service";

describe("StatisticsService", () => {
  let service: StatisticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: PrismaService,
          useValue: {
            customer: {
              count: jest.fn(),
            },
            contract: {
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            product: {
              count: jest.fn(),
            },
            invoice: {
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            notification: {
              count: jest.fn(),
            },
            followRecord: {
              findMany: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboardStats", () => {
    it("should return dashboard statistics", async () => {
      // Mock data
      const mockStats = {
        totalCustomers: 100,
        totalContracts: 50,
        totalProducts: 10,
        totalInvoices: 30,
      };

      // Setup mocks
      (prisma.customer.count as jest.Mock)
        .mockResolvedValueOnce(mockStats.totalCustomers)
        .mockResolvedValueOnce(10); // monthly new customers

      (prisma.contract.count as jest.Mock)
        .mockResolvedValueOnce(mockStats.totalContracts)
        .mockResolvedValueOnce(5); // monthly new contracts

      (prisma.product.count as jest.Mock).mockResolvedValue(
        mockStats.totalProducts,
      );

      (prisma.invoice.count as jest.Mock).mockResolvedValue(
        mockStats.totalInvoices,
      );

      (prisma.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalAmount: 100000 },
      });

      (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({
        _sum: { amount: 50000 },
      });

      (prisma.notification.count as jest.Mock).mockResolvedValue(3);

      (prisma.followRecord.findMany as jest.Mock).mockResolvedValue([]);

      // Call the method
      const result = await service.getDashboardStats();

      // Assertions
      expect(result).toHaveProperty("overview");
      expect(result).toHaveProperty("monthly");
      expect(result).toHaveProperty("recentActivities");
      expect(result).toHaveProperty("unreadNotifications");
      expect(result.overview.totalCustomers).toBe(mockStats.totalCustomers);
    });
  });

  describe("getContractStatusDistribution", () => {
    it("should return contract status distribution", async () => {
      // Mock data
      const mockDistribution = [
        { status: "PAID", _count: { id: 20 }, _sum: { totalAmount: 200000 } },
        {
          status: "UNPAID",
          _count: { id: 15 },
          _sum: { totalAmount: 150000 },
        },
        {
          status: "PARTIAL",
          _count: { id: 5 },
          _sum: { totalAmount: 50000 },
        },
      ];

      (prisma.contract.groupBy as jest.Mock).mockResolvedValue(
        mockDistribution,
      );

      // Call the method
      const result = await service.getContractStatusDistribution();

      // Assertions
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("status", "PAID");
      expect(result[0]).toHaveProperty("count", 20);
      expect(result[0]).toHaveProperty("totalAmount", 200000);
    });
  });

  describe("getSalesPerformance", () => {
    it("should return sales performance data", async () => {
      // Mock data
      const mockCustomers = [
        { followUserId: "user1", customerLevel: "CUSTOMER" },
        { followUserId: "user1", customerLevel: "VIP" },
        { followUserId: "user2", customerLevel: "LEAD" },
      ];

      const mockUsers = [
        { id: "user1", name: "销售A" },
        { id: "user2", name: "销售B" },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      // Call the method
      const result = await service.getSalesPerformance();

      // Assertions
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("userName");
      expect(result[0]).toHaveProperty("totalCustomers");
    });
  });
});
