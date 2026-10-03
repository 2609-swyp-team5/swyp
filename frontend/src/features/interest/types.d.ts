export type InterestSource = "OUR" | "EXTERNAL";

export interface InterestTarget {
    source: InterestSource;
    targetId: number;
}

export interface InterestItem extends InterestTarget {
    interestId: number;
}

export interface InterestsResponse {
    content: InterestItem[];
    nextCursor: string | null;
    hasNext: boolean;
}
