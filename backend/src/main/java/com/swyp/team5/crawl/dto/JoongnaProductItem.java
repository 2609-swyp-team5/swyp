package com.swyp.team5.crawl.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JoongnaProductItem(long seq, String title, long price, int state, String url) {

    private static final int SELLING_STATE = 0;

    public boolean isSelling() {
        return state == SELLING_STATE;
    }
}
