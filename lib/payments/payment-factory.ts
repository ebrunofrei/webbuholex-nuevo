import { PaymentService } from "./payment-service";
import { PostgresPaymentUnitOfWork } from "./postgres-payment-unit-of-work";

export function createPostgresPaymentService(): PaymentService {
  const uow = new PostgresPaymentUnitOfWork();
  return new PaymentService(uow);
}
