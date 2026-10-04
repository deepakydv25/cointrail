package com.deepak.cointrailapi.transaction;

import com.deepak.cointrailapi.category.CategoryType;

public interface AnalyticsCategoryProjection extends AnalyticsTotalsProjection {
    Long getCategoryId();
    String getCategoryName();
    CategoryType getCategoryType();
    boolean getSystem();
    boolean getActive();
}
