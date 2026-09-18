-- 미매칭 91건 중 "애매함 — 판단 보류"였던 27건을 재검토해 확정한 19건 추가(2026-09-19).
-- 나머지 8건(68/94/100/123/129/130/132/146)은 도메인이 다르거나(예: 게임/콘솔 vs 게임 타이틀)
-- 서로 다른 로컬 카테고리가 같은 번개장터 노드로 겹치는 문제(예: 디자인/제작 vs 사진/영상)가 있어
-- 미반영 유지. 상세 근거는 docs/시세수집-번개장터-API-참고.md 참고.
INSERT INTO category_platforms (category_id, platform_id, external_category_id)
SELECT mapping.category_id, bunjang.platform_id, mapping.external_category_id
FROM (VALUES
    (66, '600500'),
    (79, '700800'),
    (86, '930500'),
    (91, '920200999'),
    (98, '900500200'),
    (99, '990300'),
    (102, '990100'),
    (122, '500119'),
    (140, '600100005'),
    (147, '600300004'),
    (149, '600500006'),
    (159, '600500002'),
    (173, '810100200'),
    (174, '810100200'),
    (175, '810100100'),
    (176, '810100100'),
    (177, '810100500'),
    (178, '810100500'),
    (179, '800400050')
) AS mapping(category_id, external_category_id)
CROSS JOIN (SELECT platform_id FROM platforms WHERE name = '번개장터') AS bunjang;
