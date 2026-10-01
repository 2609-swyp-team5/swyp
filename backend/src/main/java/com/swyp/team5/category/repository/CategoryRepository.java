package com.swyp.team5.category.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.category.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByIdAsc();

    /** 카테고리의 최상위(대분류) 이름. 부모를 따라 올라가는 재귀 쿼리라 트랜잭션 밖(지연 로딩 불가)에서도 쓸 수 있다. */
    @Query(
            value =
                    """
                    WITH RECURSIVE ancestors AS (
                        SELECT category_id, parent_id, name FROM categories WHERE category_id = :categoryId
                        UNION ALL
                        SELECT c.category_id, c.parent_id, c.name
                        FROM categories c JOIN ancestors a ON c.category_id = a.parent_id
                    )
                    SELECT name FROM ancestors WHERE parent_id IS NULL
                    """,
            nativeQuery = true)
    Optional<String> findRootName(@Param("categoryId") Long categoryId);
}
