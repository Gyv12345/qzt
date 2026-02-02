declare namespace API {
  interface Customer {
    id: string;
    name: string;
    contactName: string;
    contactPhone: string;
    customerLevel: number;
    followUserId?: string;
  }

  interface PageResult<T> {
    list: T[];
    total: number;
  }

  interface Response<T> {
    code: number;
    data: T;
    message: string;
  }
}
