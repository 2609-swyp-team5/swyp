package com.swyp.team5.platform.joongna.dto;

import java.util.List;

import com.swyp.team5.product.entity.IncludedStatus;

public record JoongnaListingForm(
        String title,
        long price,
        String description,
        long categorySeq,
        boolean newProduct,
        boolean parcelFeeIncluded,
        IncludedStatus includedStatus,
        List<String> imageUrls) {}
