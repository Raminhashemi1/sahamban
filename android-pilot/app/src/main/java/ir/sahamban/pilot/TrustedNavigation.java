package ir.sahamban.pilot;

import java.net.URI;

/** Pure host/path policy: only this project's HTTPS GitHub Pages PWA is internal. */
public final class TrustedNavigation {
    private static final String HOST = "raminhashemi1.github.io";
    private static final String APP_PATH = "/sahamban";

    private TrustedNavigation() {}

    public static boolean isInternal(String rawUrl) {
        if (rawUrl == null || rawUrl.length() > 8192) return false;
        try {
            URI uri = URI.create(rawUrl);
            String path = uri.getPath();
            return "https".equalsIgnoreCase(uri.getScheme())
                && HOST.equalsIgnoreCase(uri.getHost())
                && uri.getRawUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && path != null
                && (APP_PATH.equals(path) || path.startsWith(APP_PATH + "/"));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
