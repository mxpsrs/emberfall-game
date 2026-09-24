package games.emberfall.beta;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/** Online Android client. Authentication and game state stay on Veldren's server. */
public final class MainActivity extends Activity {
    private static final String GAME_URL = "https://emberfall-realms.rayfgarrison97.chatgpt.site/";
    private static final String GAME_HOST = "veldren-realms.rayfgarrison97.chatgpt.site";
    private FrameLayout root;
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private View fullscreenContent;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private boolean failed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(20, 30, 35));
        setContentView(root);
        configureInsets();
        createWebView();
        immerse();
    }

    private static boolean gameOrigin(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && GAME_HOST.equalsIgnoreCase(uri.getHost()) && uri.getUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private void createWebView() {
        if (web != null) { root.removeView(web); web.destroy(); }
        root.removeAllViews();
        failed = false;
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(20, 30, 35));
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " VeldrenAndroid/0.1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(30), dp(20), dp(30), dp(20));
        errorPanel.setBackgroundColor(Color.rgb(20, 30, 35));
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (gameOrigin(uri)) return false;
                if (request.isForMainFrame() && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (android.content.ActivityNotFoundException ignored) { showError("No browser is available to open this link."); }
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                failed = false; errorPanel.setVisibility(View.GONE); progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                if (!failed && gameOrigin(Uri.parse(url))) {
                    // Communicate the already-fullscreen native shell without a JavaScript bridge.
                    view.evaluateJavascript("Object.defineProperty(navigator,'standalone',{value:true,configurable:true});if(typeof syncPlayDisplay==='function')syncPlayDisplay();", null);
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("Could not connect to Veldren. Check your internet connection, then retry.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame()) showError(response.getStatusCode() == 503 ? "Veldren is temporarily unavailable or under maintenance. Try again shortly." : "Veldren could not load. Please retry.");
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view); view.destroy(); web = null;
                showError("The game view closed. Tap Retry to reconnect to your saved character.");
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenContent != null) { callback.onCustomViewHidden(); return; }
                fullscreenContent = view; fullscreenCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1)); immerse();
            }
            @Override public void onHideCustomView() { hideCustomView(); }
        });
        web.loadUrl(GAME_URL);
    }

    private void showError(String message) {
        failed = true; progress.setVisibility(View.GONE); errorPanel.removeAllViews();
        TextView title = new TextView(this); title.setText("Veldren"); title.setTextSize(26); title.setTextColor(Color.rgb(223, 190, 126)); title.setGravity(Gravity.CENTER); errorPanel.addView(title);
        TextView text = new TextView(this); text.setText(message); text.setTextSize(16); text.setTextColor(Color.WHITE); text.setGravity(Gravity.CENTER); text.setPadding(0, dp(14), 0, dp(14)); errorPanel.addView(text);
        Button retry = new Button(this); retry.setText("Retry"); retry.setOnClickListener(v -> createWebView()); errorPanel.addView(retry);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void configureInsets() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return insets;
            });
        } else {
            root.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
                Rect visible = new Rect(); root.getWindowVisibleDisplayFrame(visible);
                int keyboard = root.getRootView().getHeight() - visible.bottom;
                int left = 0, right = 0;
                if (Build.VERSION.SDK_INT >= 28 && root.getRootWindowInsets() != null && root.getRootWindowInsets().getDisplayCutout() != null) {
                    left = root.getRootWindowInsets().getDisplayCutout().getSafeInsetLeft();
                    right = root.getRootWindowInsets().getDisplayCutout().getSafeInsetRight();
                }
                int bottom = keyboard > dp(120) ? keyboard : 0;
                if (root.getPaddingLeft()!=left || root.getPaddingRight()!=right || root.getPaddingBottom()!=bottom) root.setPadding(left, 0, right, bottom);
            });
        }
    }
    private void immerse() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) { controller.hide(WindowInsets.Type.systemBars()); controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
        } else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void hideCustomView() {
        if (fullscreenContent != null) { root.removeView(fullscreenContent); fullscreenContent = null; }
        if (fullscreenCallback != null) { fullscreenCallback.onCustomViewHidden(); fullscreenCallback = null; }
        immerse();
    }
    private void saveProgress() { if (web != null && gameOrigin(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) web.evaluateJavascript("if(typeof flushCloudSave==='function')flushCloudSave();", null); }
    @Override protected void onPause() { saveProgress(); CookieManager.getInstance().flush(); if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); immerse(); }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immerse(); }
    @Override public void onBackPressed() {
        if (fullscreenContent != null) { hideCustomView(); return; }
        new AlertDialog.Builder(this).setTitle("Leave Veldren?").setMessage("Return to your home screen?").setNegativeButton("Keep playing", (d,w) -> immerse()).setPositiveButton("Leave", (d,w) -> { saveProgress(); moveTaskToBack(true); }).show();
    }
    @Override protected void onDestroy() { if (web != null) { root.removeView(web); web.destroy(); web = null; } super.onDestroy(); }
}
