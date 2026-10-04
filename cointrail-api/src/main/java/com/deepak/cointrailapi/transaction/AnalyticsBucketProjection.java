package com.deepak.cointrailapi.transaction;

import java.time.LocalDate;

public interface AnalyticsBucketProjection extends AnalyticsTotalsProjection {
    LocalDate getBucketStart();
}
