package ir.sahamban.pilot;

public final class SahminoStorePriceMatcherTest {
    public static void main(String[] args) {
        check(true, "۱٬۵۰۰٬۰۰۰ ریال", 1_500_000L);
        check(true, "1,500,000 ريال", 1_500_000L);
        check(true, "۲٬۸۵۰٬۰۰۰ ریال", 2_850_000L);
        check(false, "۱۵۰٬۰۰۰ تومان", 1_500_000L);
        check(false, "1,500,000", 1_500_000L);
        check(false, "۱٬۵۰۰٬۰۰۰ ریال تومان", 1_500_000L);
        check(false, "۱٬۵۰۰٬۰۰۱ ریال", 1_500_000L);
        check(false, "1.500.000 ریال", 1_500_000L);
        check(false, "-1,500,000 ریال", 1_500_000L);
        check(false, "1,500,000 ریال ۱۰٪", 1_500_000L);
        check(false, null, 1_500_000L);
        check(false, "۱٬۵۰۰٬۰۰۰ ریال", 0L);
        check(false, "999999999999999999 ریال", 1_500_000L);
        System.out.println("SahminoStorePriceMatcherTest: PASS");
    }

    private static void check(boolean expected, String formatted, long amount) {
        boolean actual = SahminoStorePriceMatcher.matches(formatted, amount);
        if (actual != expected) {
            throw new AssertionError("expected=" + expected + ", actual=" + actual + ", value=" + formatted);
        }
    }
}
