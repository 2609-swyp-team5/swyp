package com.swyp.team5.admin.dto;

public record AdminDashboardResponse(
        long totalMembers, long totalProducts, long todayNewMembers, long todayNewProducts) {}
