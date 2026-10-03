export type {
    AnalysisRecommendation,
    ProductAnalysisResponse as ProductMarketAnalysis,
    ProductCompetitionResponse as ProductCompetition,
    ProductDetailSummaryResponse,
    ProductPriceTrendResponse as ProductPriceTrend,
    ProductValuationForecastResponse as ProductValuationForecast,
} from "./schemas/productManagementResponseSchema";

export type ProductManagementPerspective = "SELL" | "BUY";
