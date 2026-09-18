package com.swyp.team5.crawl.client.dto;

import java.util.List;

public record BunjangCategoryPage(List<BunjangProductItem> items, String nextCursor, boolean hasNext) {}
