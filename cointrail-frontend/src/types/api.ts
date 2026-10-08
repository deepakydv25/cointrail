/** The consumed subset of Spring's raw Page, not an invented success envelope. */
export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface ErrorResponse {
    status: number;
    message: string;
    errors: Record<string, string> | null;
}
