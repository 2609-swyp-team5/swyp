-- 카테고리 매핑 19건 추가
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
