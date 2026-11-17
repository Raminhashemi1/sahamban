package ir.sahamban.pilot;

public final class SahminoBillingCatalogTest {
    public static void main(String[] args) {
        int[] days = {30, 60, 90, 180, 365};
        long[] toman = {150_000L, 285_000L, 405_000L, 765_000L, 1_460_000L};
        String[] ids = {"sahmino_pro_30d", "sahmino_pro_60d", "sahmino_pro_90d",
            "sahmino_pro_180d", "sahmino_pro_365d"};
        if (SahminoBillingCatalog.size() != 5) throw new AssertionError("plan count");
        for (int i = 0; i < 5; i++) {
            SahminoBillingCatalog.Plan p = SahminoBillingCatalog.at(i);
            if (p.days != days[i] || p.priceToman != toman[i]
                || p.priceRial != toman[i] * 10L || !p.productId.equals(ids[i])
                || SahminoBillingCatalog.byPlanId(p.planId) != p
                || SahminoBillingCatalog.byProductId(ids[i]) != p)
                throw new AssertionError("catalog mismatch at " + i);
        }
        if (SahminoBillingCatalog.byPlanId("UNKNOWN") != null
            || SahminoBillingCatalog.byProductId("unknown") != null
            || SahminoBillingCatalog.byPlanId(null) != null
            || SahminoBillingCatalog.byProductId(null) != null)
            throw new AssertionError("unknown product must not resolve");
        if (SahminoBillingCatalog.productIds().length != 5)
            throw new AssertionError("product list length");
        System.out.println("SahminoBillingCatalogTest: PASS");
    }
}
