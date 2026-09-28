package com.swyp.team5.admin.repository;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;

/**
 * 관리자 회원 검색 조건.
 *
 * <p>JPQL에 {@code :param is null} 형태로 조건을 넣으면 PostgreSQL이 바인딩 파라미터의 타입을 추론하지 못해
 * {@code could not determine data type} / {@code function lower(bytea) does not exist}로 실패한다.
 * 그래서 값이 있는 조건만 조립하는 Specification 방식을 쓴다.
 */
public final class MemberSearchSpecification {

    private MemberSearchSpecification() {}

    /**
     * @param status {@code null}이면 상태 조건을 걸지 않는다
     * @param keyword {@code null}이면 검색 조건을 걸지 않는다. 있으면 이메일·이름·닉네임을 대소문자 구분 없이 부분 일치로 찾는다
     */
    public static Specification<Member> of(MemberStatus status, String keyword) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }
            if (keyword != null) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(builder.or(
                        builder.like(builder.lower(root.get("email")), pattern),
                        builder.like(builder.lower(root.get("name")), pattern),
                        builder.like(builder.lower(root.get("nickname")), pattern)));
            }

            return predicates.isEmpty() ? null : builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
