package com.swyp.team5.platform.joongna.dto;

import java.util.List;

public record JoongnaListingForm(
        String title,
        long price,
        String description,
        long categorySeq,
        boolean newProduct,
        boolean parcelFeeIncluded,
        List<String> imageUrls) {}
