package ir.sahamban.pilot;

/**
 * Immutable client-side mapping for the five approved Sahmino plans.
 * Product IDs are provisional until created and verified in BOTH store consoles.
 * Prices are display/consistency values only; the server catalog remains authoritative.
 */
public final class SahminoBillingCatalog {
    public static final class Plan {
        public final String planId;
        public final int days;
        public final long priceToman;
        public final long priceRial;
        public final String productId;

        private Plan(String planId, int days, long priceToman, String productId) {
            this.planId = planId;
            this.days = days;
            this.priceToman = priceToman;
            this.priceRial = Math.multiplyExact(priceToman, 10L);
            this.productId = productId;
        }
    }

    private static final Plan[] PLANS = {
        new Plan("SAHMINO_PRO_30D", 30, 150_000L, "sahmino_pro_30d"),
        new Plan("SAHMINO_PRO_60D", 60, 285_000L, "sahmino_pro_60d"),
        new Plan("SAHMINO_PRO_90D", 90, 405_000L, "sahmino_pro_90d"),
        new Plan("SAHMINO_PRO_180D", 180, 765_000L, "sahmino_pro_180d"),
        new Plan("SAHMINO_PRO_365D", 365, 1_460_000L, "sahmino_pro_365d")
    };

    private SahminoBillingCatalog() { }
    public static int size() { return PLANS.length; }

    public static Plan at(int index) {
        if (index < 0 || index >= PLANS.length) throw new IllegalArgumentException("Unknown plan index");
        return PLANS[index];
    }

    public static Plan byPlanId(String planId) {
        if (planId == null) return null;
        for (Plan plan : PLANS) if (plan.planId.equals(planId)) return plan;
        return null;
    }

    public static Plan byProductId(String productId) {
        if (productId == null) return null;
        for (Plan plan : PLANS) if (plan.productId.equals(productId)) return plan;
        return null;
    }

    public static String[] productIds() {
        String[] result = new String[PLANS.length];
        for (int i = 0; i < PLANS.length; i++) result[i] = PLANS[i].productId;
        return result;
    }
}
