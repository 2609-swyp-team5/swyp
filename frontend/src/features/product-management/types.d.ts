export type {
    AnalysisRecommendation,
    ProductAnalysisResponse as ProductMarketAnalysis,
    ProductCompetitionResponse as ProductCompetition,
    ProductDetailSummaryResponse,
    ProductPriceDistributionResponse as ProductPriceDistribution,
    ProductPriceTrendResponse as ProductPriceTrend,
    ProductValuationForecastResponse as ProductValuationForecast,
} from "./schemas/productManagementResponseSchema";

export type ProductManagementPerspective = "SELL" | "BUY";
