export type DataSource = "api" | "mock";

// API를 기본값으로 두고, 로컬에서만 NEXT_PUBLIC_DATA_SOURCE=mock으로 전체 mock을 켭니다.
export const dataSource: DataSource =
    process.env.NEXT_PUBLIC_DATA_SOURCE?.toLowerCase() === "mock" ? "mock" : "api";
