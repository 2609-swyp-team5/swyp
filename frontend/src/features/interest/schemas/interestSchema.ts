import { z } from "zod";

export const interestSourceSchema = z.enum(["OUR", "EXTERNAL"]);
export const interestRecommendationSchema = z.enum(["BUY", "WAIT"]);
export const interestStatusSchema = z.enum(["BUY", "WAIT", "SOLD_OUT", "PENDING"]);
