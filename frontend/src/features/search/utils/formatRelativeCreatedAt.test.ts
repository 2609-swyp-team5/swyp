import { describe, expect, it } from "vitest";

import { formatRelativeCreatedAt } from "./formatRelativeCreatedAt";

const now = Date.parse("2026-10-01T12:00:00+09:00");

describe("formatRelativeCreatedAt", () => {
    it.each([
        ["2026-10-01T11:59:30", "방금 전"],
        ["2026-10-01T11:55:00", "5분 전"],
        ["2026-10-01T11:00:00", "1시간 전"],
        ["2026-09-30T12:00:00", "1일 전"],
        ["2026-10-01T11:00:00.150548+09:00", "59분 전"],
    ])("formats %s as %s", (createdAt, expected) => {
        expect(formatRelativeCreatedAt(createdAt, now)).toBe(expected);
    });

    it("handles future and invalid timestamps", () => {
        expect(formatRelativeCreatedAt("2026-10-01T12:01:00", now)).toBe("방금 전");
        expect(formatRelativeCreatedAt("invalid", now)).toBe("날짜 정보 없음");
    });
});
