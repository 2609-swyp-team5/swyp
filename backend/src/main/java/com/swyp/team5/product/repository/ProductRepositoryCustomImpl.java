package com.swyp.team5.product.repository;

import java.util.EnumMap;
import java.util.Map;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;

import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;

/** {@link ProductRepositoryCustom} 구현. 목록 조회와 같은 {@link Specification}을 그대로 써서 조건이 어긋나지 않게 한다. */
@RequiredArgsConstructor
class ProductRepositoryCustomImpl implements ProductRepositoryCustom {

    private final EntityManager entityManager;

    @Override
    public Map<ProductStatus, Long> countByStatus(Specification<Product> spec) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Product> root = query.from(Product.class);
        Path<ProductStatus> status = root.get("status");
        query.multiselect(status, cb.count(root)).groupBy(status);
        Predicate where = spec == null ? null : spec.toPredicate(root, query, cb);
        if (where != null) {
            query.where(where);
        }

        Map<ProductStatus, Long> counts = new EnumMap<>(ProductStatus.class);
        for (Tuple row : entityManager.createQuery(query).getResultList()) {
            counts.put(row.get(0, ProductStatus.class), row.get(1, Long.class));
        }
        return counts;
    }
}
