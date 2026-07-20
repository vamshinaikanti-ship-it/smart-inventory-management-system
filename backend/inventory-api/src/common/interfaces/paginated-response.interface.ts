import { Pagination } from './pagination.interface';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
