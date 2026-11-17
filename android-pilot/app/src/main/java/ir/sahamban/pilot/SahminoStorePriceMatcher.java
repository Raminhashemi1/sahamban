package ir.sahamban.pilot;

/** Strict display-price comparison: accepts explicit Rial only; never converts currencies. */
public final class SahminoStorePriceMatcher {
    private SahminoStorePriceMatcher() { }

    public static boolean matches(String formatted, long expectedRial) {
        if (formatted == null || formatted.trim().isEmpty()
            || formatted.length() > 120 || expectedRial <= 0) return false;

        String value = formatted.trim();
        boolean toman = value.contains("تومان");
        boolean rial = value.contains("ریال") || value.contains("ريال");
        if (toman || !rial) return false;

        value = value.replace("ریال", "").replace("ريال", "");
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            int digit = Character.digit(ch, 10);
            if (digit >= 0) {
                digits.append((char) ('0' + digit));
            } else if (Character.isWhitespace(ch) || ch == ',' || ch == '٬'
                || ch == '\u00a0' || ch == '\u202f' || ch == '\u200e'
                || ch == '\u200f') {
                // Grouping and bidirectional formatting characters only.
            } else {
                // Reject signs, decimals, percentages, unknown currency units and suffixes.
                return false;
            }
        }
        if (digits.length() == 0 || digits.length() > 15) return false;
        try {
            return Long.parseLong(digits.toString()) == expectedRial;
        } catch (NumberFormatException ex) {
            return false;
        }
    }
}
