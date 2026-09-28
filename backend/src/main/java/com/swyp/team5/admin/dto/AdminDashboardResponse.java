package com.swyp.team5.admin.dto;

/**
 * 관리자 대시보드 통계.
 *
 * @param totalMembers 탈퇴 회원을 포함한 전체 회원 수
 * @param activeMembers 정상 이용 중인 회원 수
 * @param suspendedMembers 정지된 회원 수
 * @param withdrawnMembers 탈퇴한 회원 수
 * @param newMembersToday 오늘 가입한 회원 수
 * @param totalProducts 전체 상품 수
 * @param onSaleProducts 판매중인 상품 수
 * @param hiddenProducts 게시 중단된 상품 수
 * @param newProductsToday 오늘 등록된 상품 수
 */
public record AdminDashboardResponse(
        long totalMembers,
        long activeMembers,
        long suspendedMembers,
        long withdrawnMembers,
        long newMembersToday,
        long totalProducts,
        long onSaleProducts,
        long hiddenProducts,
        long newProductsToday) {}
