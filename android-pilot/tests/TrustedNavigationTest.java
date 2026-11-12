package ir.sahamban.pilot;

public final class TrustedNavigationTest {
    private static void allow(String url) {
        if (!TrustedNavigation.isInternal(url)) throw new AssertionError("Expected internal URL: " + url);
    }
    private static void deny(String url) {
        if (TrustedNavigation.isInternal(url)) throw new AssertionError("Unsafe URL accepted: " + url);
    }
    public static void main(String[] args) {
        allow("https://raminhashemi1.github.io/sahamban/");
        allow("https://raminhashemi1.github.io/sahamban/install.html");
        allow("https://raminhashemi1.github.io/sahamban/?view=portfolio");
        deny("http://raminhashemi1.github.io/sahamban/");
        deny("https://raminhashemi1.github.io.evil.example/sahamban/");
        deny("https://raminhashemi1.github.io@evil.example/sahamban/");
        deny("https://raminhashemi1.github.io/sahamban-evil/");
        deny("https://raminhashemi1.github.io/");
        deny("https://raminhashemi1.github.io:444/sahamban/");
        deny("file:///sdcard/Download/secret.html");
        deny("javascript:alert(1)");
        deny("intent://open/#Intent;scheme=foo;end");
        deny("");
        deny(null);
        System.out.println("PASS TrustedNavigation: exact origin/path and non-HTTPS rejected");
    }
}
